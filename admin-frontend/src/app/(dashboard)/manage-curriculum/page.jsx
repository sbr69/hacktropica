"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../../../context/ToastContext";
import { API_BASE_URL, api } from "../../../services/api";
import {
  Plus,
  Trash2,
  X,
  Save,
  BookMarked,
  MoreHorizontal,
  ArrowRight,
  ChevronDown,
  Lock
} from "lucide-react";
import { cn } from "../../../utils/helpers";
import RoleProtectedRoute from '../../../components/RoleProtectedRoute';

export default function ManageCurriculumPage() {
  const { addToast } = useToast();
  const [curriculum, setCurriculum] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedStream, setSelectedStream] = useState("");
  const [newStreamName, setNewStreamName] = useState("");
  const [subjectInputs, setSubjectInputs] = useState({});

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const fetchCurriculum = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/filters`);
      const data = await res.json();
      if (data && data.curriculum) {
        setCurriculum(data.curriculum);
        const streams = Object.keys(data.curriculum);
        if (streams.length > 0) {
          setSelectedStream(streams[0]);
        }
      }
    } catch (err) {
      addToast({ type: "error", message: "Failed to load curriculum" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // api.admin.saveCurriculum iterates each stream+semester
      // and POSTs { stream, semester, subjects } individually
      const results = await api.admin.saveCurriculum(curriculum);

      const errors = results.filter(r => r.status === 'error');
      if (errors.length > 0) {
        const errorDetails = errors.map(e => `${e.stream}/${e.semester}: ${e.error}`).join('; ');
        throw new Error(`Some entries failed: ${errorDetails}`);
      }
      addToast({ type: "success", message: "Curriculum saved successfully" });
    } catch (err) {
      addToast({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const addStream = () => {
    if (!newStreamName.trim()) return;
    const name = newStreamName.trim().toLowerCase();
    if (curriculum[name]) {
      addToast({ type: "warning", message: "Stream already exists." });
      return;
    }
    setCurriculum((prev) => ({ ...prev, [name]: { "sem 1": ["NA"] } }));
    setNewStreamName("");
    setSelectedStream(name);
  };

  const removeStream = (stream) => {
    if (!window.confirm(`Are you sure you want to remove the stream '${stream}'?`)) return;
    const updated = { ...curriculum };
    delete updated[stream];
    setCurriculum(updated);
    if (selectedStream === stream) {
      const remaining = Object.keys(updated);
      setSelectedStream(remaining.length > 0 ? remaining[0] : "");
    }
  };

  const addSemester = () => {
    if (!selectedStream) return;
    
    // Find the next semester number based on existing keys
    const currentSems = curriculum[selectedStream] ? Object.keys(curriculum[selectedStream]) : [];
    
    let maxSem = 0;
    currentSems.forEach(s => {
      // Extract number from format "sem X"
      const match = s.match(/sem\s+(\d+)/i);
      if (match && parseInt(match[1]) > maxSem) {
        maxSem = parseInt(match[1]);
      }
    });
    
    const nextSemNum = maxSem + 1;
    const newSemStr = `sem ${nextSemNum}`;
    
    const updated = { ...curriculum };
    if (!updated[selectedStream]) {
        updated[selectedStream] = {};
    }
    updated[selectedStream][newSemStr] = ["NA"];
    setCurriculum(updated);
  };

  const removeSem = (sem) => {
    if (!window.confirm(`Are you sure you want to remove '${sem}'?`)) return;
    const updated = { ...curriculum };
    delete updated[selectedStream][sem];
    setCurriculum(updated);
  };

  const handleSubjectInputChange = (sem, value) => {
    setSubjectInputs(prev => ({ ...prev, [sem]: value }));
  };

  const handleSubjectInputKeyDown = (e, sem) => {
    if (e.key === "Enter" && subjectInputs[sem]?.trim()) {
      addSubject(sem, subjectInputs[sem]);
    }
  };

  const addSubject = (sem, subName) => {
    const sub = subName.trim().toLowerCase();
    const currentSubs = curriculum[selectedStream][sem] || [];
    if (currentSubs.includes(sub)) {
      addToast({ type: "warning", message: "Subject already exists here." });
      return;
    }
    let newSubs = [...currentSubs, sub];
    if (newSubs.includes("NA") && newSubs.length > 1 && sub !== "NA") {
      newSubs = newSubs.filter((s) => s !== "NA");
    }
    const updated = { ...curriculum };
    updated[selectedStream][sem] = newSubs;
    setCurriculum(updated);
    setSubjectInputs(prev => ({ ...prev, [sem]: "" }));
  };

  const removeSubject = (sem, sub) => {
    const updated = { ...curriculum };
    updated[selectedStream][sem] = updated[selectedStream][sem].filter((s) => s !== sub);
    if (updated[selectedStream][sem].length === 0) {
      updated[selectedStream][sem] = ["NA"];
    }
    setCurriculum(updated);
  };

  if (loading) {
    return (
      <RoleProtectedRoute requiredRoles={['admin', 'superuser']} routeName="manage-curriculum">
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-neutral-200 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-600 font-medium text-sm">Initializing curriculum space...</p>
          </div>
        </div>
      </RoleProtectedRoute>
    );
  }

  const streams = Object.keys(curriculum);
  let semesters = selectedStream && curriculum[selectedStream] ? Object.keys(curriculum[selectedStream]) : [];

  semesters.sort((a, b) => {
    const numA = a.match(/sem\s+(\d+)/i) ? parseInt(a.match(/sem\s+(\d+)/i)[1]) : 0;
    const numB = b.match(/sem\s+(\d+)/i) ? parseInt(b.match(/sem\s+(\d+)/i)[1]) : 0;
    if (numA && numB) return numA - numB;
    return a.localeCompare(b);
  });

  return (
    <RoleProtectedRoute requiredRoles={['admin', 'superuser']} routeName="manage-curriculum">
      <div className="w-full h-full p-1 md:p-2 flex flex-col overflow-hidden">
        <div className="flex-1 bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* Header Bar */}
          <div className="border-b border-neutral-200/80 bg-white px-4 md:px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Academic Curriculum</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Manage streams, semesters, and course subjects</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? "Publishing..." : "Publish"}
          </motion.button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex gap-0">
          {/* Left Sidebar - Streams Navigation */}
          <div className="w-64 border-r border-neutral-200/80 bg-white/50 backdrop-blur-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200/50">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Streams</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 p-3">
              {streams.map((stream) => (
                <motion.button
                  key={stream}
                  whileHover={{ x: 2 }}
                  onClick={() => setSelectedStream(stream)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all relative group",
                    selectedStream === stream
                      ? "bg-indigo-100 text-indigo-900 shadow-sm ring-1 ring-indigo-200"
                      : "text-neutral-700 hover:bg-neutral-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize truncate">{stream}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStream(stream);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 transition-all p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="border-t border-neutral-200/50 p-3">
              <input
                type="text"
                placeholder="New stream..."
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStream()}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
              />
              <button
                onClick={addStream}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Stream
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-auto">
            {selectedStream ? (
              <motion.div
                key={selectedStream}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full p-3 md:p-4"
              >
                {/* Stream Header Card */}
                <div className="mb-4 bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-900 capitalize">{selectedStream} Stream</h2>
                      <p className="text-neutral-600 text-sm mt-1">Configure semesters and course structure</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={addSemester}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" /> Semester
                    </motion.button>
                  </div>
                  
                  <div className="flex gap-3 pt-4 border-t border-neutral-100">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-neutral-500 uppercase">Semesters</p>
                      <p className="text-2xl font-bold text-neutral-900 mt-1">{semesters.length}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-neutral-500 uppercase">Courses</p>
                      <p className="text-2xl font-bold text-neutral-900 mt-1">
                        {semesters.reduce((sum, sem) => {
                          const subjectCount = curriculum[selectedStream][sem]?.filter(s => s !== "NA").length || 0;
                          return sum + subjectCount;
                        }, 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Semesters Grid */}
                {semesters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                      {semesters.map((sem) => {
                        const subjects = curriculum[selectedStream][sem] || [];
                        const realSubjects = subjects.filter(s => s !== "NA");

                        return (
                          <motion.div
                            layout
                            key={sem}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white rounded-xl border border-neutral-200/80 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all h-[300px]"
                          >
                            {/* Card Header */}
                            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-transparent border-b border-neutral-200/50 flex items-center justify-between">
                              <div className="flex items-center action gap-3">
                                <div className="w-2 h-6 rounded-full bg-indigo-500"></div>
                                <div>
                                  <h3 className="font-bold text-neutral-900 capitalize">{sem}</h3>
                                  <p className="text-xs text-neutral-500 mt-0.5">{realSubjects.length} course{realSubjects.length !== 1 ? "s" : ""}</p>
                                </div>
                              </div>
                              <motion.button
                                whileHover={{ rotate: 90 }}
                                onClick={() => removeSem(sem)}
                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>

                            {/* Courses List */}
                            <div className="flex-1 px-5 py-4 space-y-2 overflow-y-auto show-scrollbar">
                              {realSubjects.length > 0 ? (
                                realSubjects.map((sub, idx) => (
                                  <motion.div
                                    key={sub}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group/item flex items-center gap-2 bg-neutral-50 px-3 py-2.5 rounded-lg border border-neutral-200/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></div>
                                    <span className="text-sm font-medium text-neutral-700 capitalize truncate flex-1">{sub}</span>
                                    <button
                                      onClick={() => removeSubject(sem, sub)}
                                      className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover/item:opacity-100 transition-all flex-shrink-0"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </motion.div>
                                ))
                              ) : (
                                <div className="py-6 text-center">
                                  <BookMarked className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                                  <p className="text-xs text-neutral-500 font-medium">No courses added</p>
                                </div>
                              )}
                            </div>

                            {/* Add Course Input */}
                            <div className="px-5 py-3 border-t border-neutral-200/50 bg-neutral-50/50">
                              <div className="flex action gap-2">
                                <input
                                  type="text"
                                  placeholder="Add course..."
                                  value={subjectInputs[sem] || ""}
                                  onChange={(e) => handleSubjectInputChange(sem, e.target.value)}
                                  onKeyDown={(e) => handleSubjectInputKeyDown(e, sem)}
                                  className="flex-1 px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                />
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    if (subjectInputs[sem]?.trim()) {
                                      addSubject(sem, subjectInputs[sem]);
                                    }
                                  }}
                                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                                >
                                  <Plus className="w-4 h-4" />
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4">
                      <BookMarked className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-1">No semesters created</h3>
                    <p className="text-neutral-600 text-sm max-w-sm mb-6">
                      Start building your curriculum by creating your first semester structure.
                    </p>
                    <button
                      onClick={addSemester}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-all"
                    >
                      <Plus className="w-4 h-4" /> Create First Semester
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookMarked className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">Select a Stream</h2>
                  <p className="text-neutral-600 text-sm mb-6 leading-relaxed">
                    Choose an existing stream from the left panel, or create a new one to start building your curriculum structure.
                  </p>
                  <p className="text-xs text-neutral-500 font-medium">💡 Tip: Use the input field at the bottom of the streams list to add a new stream</p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </RoleProtectedRoute>
  );
}
