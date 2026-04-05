"""Search, RAG query (streaming + non-streaming), and query stats tracking."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional

import pytz
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from google.genai import types as genai_types

from models.search import (
    SearchRequest, SearchResponse, SearchResult, QueryRequest, TutorResponse,
)
from dependencies import (
    get_db, get_vector_store, get_embedding_service, get_llm_service,
    get_current_user, get_optional_user,
)

logger = logging.getLogger(__name__)

# ── System Instruction ────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """You are **Vidyarthi Saarthi**, a Socratic academic tutor for college students.

## Core Behaviour
- **Guide, don't give away.** Ask leading questions that nudge the student toward the concept. Help them reason through it themselves. Only provide a direct, complete answer when the student explicitly asks ("just tell me", "give me the answer", etc.).
- **Teach naturally.** You have access to the student's course materials behind the scenes. Use that knowledge to teach, but NEVER mention "provided context", "provided material", "study material", "the notes say", "the sources", or anything that reveals how you get your information. Just teach as a knowledgeable tutor would — directly and naturally.
- **Stay grounded.** Base your answers on the course content available to you. If you don't have relevant course content for a topic, say something like "this doesn't seem to be covered in your current syllabus" — do not fabricate or guess.
- **Be concise.** Match response length to the question. A greeting → one line. A conceptual doubt → focused explanation. No padding, no filler.
- **Be professional.** Mature, precise, no over-enthusiasm. Skip "Great question!" or "That's a wonderful thought!" — just teach.

## Response Rules
1. Greetings or small talk → one or two sentences, natural and brief.
2. Conceptual doubts → guide with a probing question or hint first. Let the student reason.
3. Direct answer requested → provide it clearly with structure (headings, bullets, code blocks as needed).
4. Reference topics by their actual names (e.g. "In arrays…", "The concept of ADT…"), not by document names or filenames.
5. Use markdown only when it adds clarity. No markdown for one-liners.
6. If the topic isn't covered in what you know about their course, say so plainly.
7. Never invent facts, equations, or code.
8. Your text answer must NEVER mention or list sources, filenames, or references. Source attribution is handled separately in the `sources` field of your JSON response.
"""


def _build_system_instruction(context_block: str) -> str:
    """Combine the base instruction with the structured context block."""
    if not context_block.strip():
        return SYSTEM_INSTRUCTION + "\n\n## Reference Material\n(No relevant course content available for this query.)\n"

    return (
        SYSTEM_INSTRUCTION
        + "\n\n## Reference Material\n(Internal — not visible to the student. Use this to inform your answers.)\n\n"
        + context_block
        + "\n"
    )


router = APIRouter(prefix="/api/v1", tags=["search"])


# ── Query Stats Tracking ─────────────────────────────────────────────

async def _track_query_stats(db, uid: str, search_results: list, vs) -> None:
    """
    Fire-and-forget update of:
      1. Global daily_queries counter
      2. Per-student query_stats (by_subject, by_module, daily_queries)
      3. Global stream-level stream_hit_counts (by_subject, by_module) — shared
         across all students in the same stream, not tied to any individual student.
    """
    try:
        ist = pytz.timezone("Asia/Kolkata")
        today = datetime.now(ist).strftime("%Y-%m-%d")

        # 1. Global daily counter
        await db.db.daily_queries.update_one(
            {"date": today},
            {"$inc": {"count": 1}},
            upsert=True,
        )

        # ── Collect subject/module data from search results ───────────
        inc_fields: Dict[str, int] = {
            "total_queries": 1,
            f"daily_queries.{today}": 1,
        }
        set_fields: Dict[str, str] = {}
        subjects_seen: set = set()
        modules_seen: set = set()

        for chunk_id, _score in search_results:
            chunk = vs.get_chunk(chunk_id)
            if not chunk:
                continue

            if chunk.subject and chunk.subject not in subjects_seen:
                safe_subj = chunk.subject.replace(".", "_").replace("/", "_")
                inc_fields[f"by_subject.{safe_subj}"] = (
                    inc_fields.get(f"by_subject.{safe_subj}", 0) + 1
                )
                subjects_seen.add(chunk.subject)

            if chunk.document_id and chunk.document_id not in modules_seen:
                safe_doc = chunk.document_id.replace(".", "_").replace("/", "_")
                set_fields[f"by_module.{safe_doc}.subject"] = chunk.subject or ""
                set_fields[f"by_module.{safe_doc}.title"] = chunk.title or chunk.source or ""
                inc_fields[f"by_module.{safe_doc}.queries"] = (
                    inc_fields.get(f"by_module.{safe_doc}.queries", 0) + 1
                )
                modules_seen.add(chunk.document_id)

        # 2. Per-student query_stats
        update: Dict = {"$inc": inc_fields}
        if set_fields:
            update["$set"] = set_fields

        await db.db.query_stats.update_one({"_id": uid}, update, upsert=True)

        # 3. Global stream-level hit counters (stream_hit_counts)
        #    Keyed by stream name (e.g. "cse"), tracks net subject + module hits
        #    shared across the entire stream.
        try:
            profile = await db.db.student_profiles.find_one({"_id": uid}, {"stream": 1})
            student_stream = (profile.get("stream", "") if profile else "").strip().lower()

            if student_stream:
                stream_inc: Dict[str, int] = {"total_queries": 1}
                stream_set: Dict[str, str] = {}

                for subj in subjects_seen:
                    safe_subj = subj.replace(".", "_").replace("/", "_")
                    stream_inc[f"by_subject.{safe_subj}"] = (
                        stream_inc.get(f"by_subject.{safe_subj}", 0) + 1
                    )

                for doc_id in modules_seen:
                    safe_doc = doc_id.replace(".", "_").replace("/", "_")
                    # Retrieve chunk again to get metadata for the set fields
                    for cid, _ in search_results:
                        c = vs.get_chunk(cid)
                        if c and c.document_id == doc_id:
                            stream_set[f"by_module.{safe_doc}.subject"] = c.subject or ""
                            stream_set[f"by_module.{safe_doc}.title"] = c.title or c.source or ""
                            break
                    stream_inc[f"by_module.{safe_doc}.queries"] = (
                        stream_inc.get(f"by_module.{safe_doc}.queries", 0) + 1
                    )

                stream_update: Dict = {"$inc": stream_inc}
                if stream_set:
                    stream_update["$set"] = stream_set

                await db.db.stream_hit_counts.update_one(
                    {"_id": student_stream},
                    stream_update,
                    upsert=True,
                )
        except Exception as stream_exc:
            logger.warning("Failed to update stream hit counts: %s", stream_exc)

    except Exception as exc:
        logger.warning("Failed to track query stats: %s", exc)


# ── Common RAG helpers ────────────────────────────────────────────────

async def _run_rag_pipeline(body: QueryRequest, vs, emb):
    """
    Shared pipeline: embed → search → build structured context.
    Returns (results, context_block, source_titles).
    """
    query_vec = await emb.encode(body.query)

    filters = None
    if body.filters:
        filters = {k: v for k, v in body.filters.model_dump().items() if v}

    results = await vs.search(query_vec, k=body.top_k, filters=filters or None)

    # Build structured context blocks
    context_parts = []
    source_titles: list[str] = []
    seen_titles: set[str] = set()

    for chunk_id, score in results:
        chunk = vs.get_chunk(chunk_id)
        if not chunk:
            continue
        title = chunk.title or chunk.source or "Unknown"
        context_parts.append(
            f"### Source: {title}\n"
            f"- **Similarity:** {score:.4f}\n"
            f"- **Content:**\n{chunk.text}"
        )
        if title not in seen_titles:
            seen_titles.add(title)
            source_titles.append(title)

    context_block = "\n\n---\n\n".join(context_parts)
    return results, context_block, source_titles


def _build_history(body: QueryRequest) -> List[genai_types.Content]:
    """Convert chat history from the request into Gemini Content objects."""
    contents = []
    if body.history:
        for h in body.history[-10:]:
            role = "user" if h.role == "user" else "model"
            contents.append(
                genai_types.Content(role=role, parts=[genai_types.Part(text=h.content)])
            )
    return contents


# ── Endpoints ─────────────────────────────────────────────────────────

@router.post("/search", response_model=SearchResponse)
async def search(
    body: SearchRequest,
    user=Depends(get_current_user),
    vs=Depends(get_vector_store),
    emb=Depends(get_embedding_service),
):
    t0 = time.perf_counter()
    query_vec = await emb.encode(body.query)

    filters = None
    if body.filters:
        filters = {k: v for k, v in body.filters.model_dump().items() if v}

    results = await vs.search(query_vec, k=body.top_k, filters=filters or None)

    search_results = []
    for chunk_id, score in results:
        chunk = vs.get_chunk(chunk_id)
        if not chunk:
            continue
        search_results.append(SearchResult(
            chunk_id=chunk_id,
            text=chunk.text,
            score=round(score, 4),
            source=chunk.source,
            title=chunk.title,
            semester=chunk.semester,
            stream=chunk.stream,
            subject=chunk.subject,
            document_id=chunk.document_id,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
        ))

    elapsed = round((time.perf_counter() - t0) * 1000, 1)
    return SearchResponse(
        results=search_results,
        query=body.query,
        total_results=len(search_results),
        timing={"total_ms": elapsed},
    )


@router.post("/query")
async def query_sync(
    body: QueryRequest,
    user=Depends(get_current_user),
    vs=Depends(get_vector_store),
    emb=Depends(get_embedding_service),
    llm=Depends(get_llm_service),
    db=Depends(get_db),
):
    """
    Non-streaming RAG query — LLM returns structured JSON with answer + sources.
    """
    results, context_block, source_titles = await _run_rag_pipeline(body, vs, emb)
    system_instruction = _build_system_instruction(context_block)
    history = _build_history(body)

    # Structured output: LLM returns {answer, sources}
    parsed = await llm.generate_chat_structured_async(
        body.query,
        system_instruction=system_instruction,
        history=history,
        response_schema=TutorResponse.model_json_schema(),
    )

    answer = parsed.get("answer", "")
    sources = parsed.get("sources", [])

    # Fire-and-forget
    asyncio.create_task(_track_query_stats(db, user["_id"], results, vs))
    if body.session_id:
        asyncio.create_task(_save_message(db, user["_id"], body.session_id, body.query, answer))

    return {"answer": answer, "sources": sources, "query": body.query}


@router.post("/query/stream")
async def query_stream(
    body: QueryRequest,
    user=Depends(get_optional_user),
    vs=Depends(get_vector_store),
    emb=Depends(get_embedding_service),
    llm=Depends(get_llm_service),
    db=Depends(get_db),
):
    """
    Streaming RAG query using NDJSON protocol.
    Each line is a JSON object:
      {"type":"chunk","text":"..."}   — streamed answer text
      {"type":"done","sources":[...]} — final event with LLM-determined sources
    """
    results, context_block, source_titles = await _run_rag_pipeline(body, vs, emb)
    system_instruction = _build_system_instruction(context_block)
    history = _build_history(body)

    # Get full structured response from LLM
    parsed = await llm.generate_chat_structured_async(
        body.query,
        system_instruction=system_instruction,
        history=history,
        response_schema=TutorResponse.model_json_schema(),
    )

    answer = parsed.get("answer", "")
    sources = parsed.get("sources", [])

    async def generate():
        # Stream the answer text in chunks
        chunk_size = 12
        for i in range(0, len(answer), chunk_size):
            yield json.dumps({"type": "chunk", "text": answer[i:i + chunk_size]}) + "\n"
            await asyncio.sleep(0.015)

        # Final event with sources
        yield json.dumps({"type": "done", "sources": sources}) + "\n"

    # Fire-and-forget stats + session persistence
    if user:
        asyncio.create_task(_track_query_stats(db, user["_id"], results, vs))
        if body.session_id:
            asyncio.create_task(_save_message(db, user["_id"], body.session_id, body.query, answer))

    return StreamingResponse(generate(), media_type="application/x-ndjson")


# ── Session persistence helper ────────────────────────────────────────

async def _save_message(db, uid: str, session_id: str, query: str, answer: str = ""):
    """Persist query (and optionally answer) to session history."""
    try:
        now = datetime.utcnow()
        messages_to_push = [{"role": "user", "content": query, "ts": now}]
        if answer:
            messages_to_push.append({"role": "assistant", "content": answer, "ts": now})

        await db.db.sessions.update_one(
            {"_id": session_id, "uid": uid},
            {
                "$push": {"messages": {"$each": messages_to_push}},
                "$set": {"updated_at": now},
                "$setOnInsert": {"created_at": now, "title": query[:60]},
            },
            upsert=True,
        )
    except Exception as exc:
        logger.warning("Failed to save message: %s", exc)
