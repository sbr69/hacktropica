"use client";

import React, { useState, useEffect } from 'react';
import RoleProtectedRoute from '../../../components/RoleProtectedRoute';
import { motion } from 'framer-motion';
import { api } from '../../../services/api';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const MOCK_SUBJECTS_DATA = [
  { subject: "Data Structures", topic: "Tree Traversal", proficiency: 45, pendingDoubts: 12 },
  { subject: "Operating Systems", topic: "Process Sync", proficiency: 72, pendingDoubts: 5 },
  { subject: "Algorithms", topic: "Dynamic Programming", proficiency: 38, pendingDoubts: 18 },
  { subject: "DBMS", topic: "Normal Forms", proficiency: 84, pendingDoubts: 3 }
];

const MOCK_STUDENT_RISKS = [
  { initials: "RS", name: "Rahul Sharma", id: "CS2101", level: "Critical", frictionPoints: ["Recursion", "Trees"], action: "Targeted Revision", reference: "3 pending doubts in DS" },
  { initials: "PV", name: "Priya Varma", id: "CS2124", level: "Moderate", frictionPoints: ["Process Sync"], action: "Extra Assignment", reference: "Operating Systems" },
  { initials: "AP", name: "Amit Patel", id: "CS2145", level: "Stable", frictionPoints: [], action: "None", reference: "Overall Good" }
];

export default function SubjectAnalysis() {
  const [subjectsData, setSubjectsData] = useState(MOCK_SUBJECTS_DATA);
  const [studentRisks, setStudentRisks] = useState(MOCK_STUDENT_RISKS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Use real analytics endpoints instead of nonexistent /api/admin/* routes
        const [streamData, overviewData] = await Promise.all([
          api.analytics.stream().catch(() => null),
          api.analytics.overview().catch(() => null),
        ]);

        // Transform stream analytics subjects into subject-analysis format
        if (streamData?.subjects?.length > 0) {
          const transformed = streamData.subjects.map(s => ({
            subject: s.subject,
            topic: "General",
            proficiency: s.proficiency_score || 0,
            pendingDoubts: s.total_queries || 0,
          }));
          setSubjectsData(transformed);
        } else {
          setSubjectsData(MOCK_SUBJECTS_DATA);
        }

        // Transform overview at-risk students into risk format
        if (overviewData?.at_risk_students?.length > 0) {
          const transformedRisks = overviewData.at_risk_students.map(s => {
            const initials = s.name ? s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'NA';
            const level = s.total_queries > 50 ? 'Critical' : s.total_queries > 20 ? 'Moderate' : 'Stable';
            return {
              initials,
              name: s.name,
              id: s.roll || s.uid,
              level,
              frictionPoints: (s.top_subjects || []).map(sub => sub.replace(/_/g, ' ')),
              action: level === 'Critical' ? 'Targeted Revision' : level === 'Moderate' ? 'Extra Assignment' : 'None',
              reference: `${s.total_queries} queries total`,
            };
          });
          setStudentRisks(transformedRisks);
        } else {
          setStudentRisks(MOCK_STUDENT_RISKS);
        }
      } catch (err) {
        console.error("Failed to fetch subject analytics:", err);
        setSubjectsData(MOCK_SUBJECTS_DATA);
        setStudentRisks(MOCK_STUDENT_RISKS);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <RoleProtectedRoute routeName="subject-analysis">
    <motion.div 
      className="bg-[#f5f6f7] text-[#2c2f30] font-['Space_Grotesk'] w-full min-h-screen relative pb-12"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* TopAppBar - Modified inner spacing to fit the existing AppShell layout */}
      <header className="bg-[#f5f6f7] dark:bg-neutral-900 sticky top-0 z-40 flex justify-between items-center w-full px-4 md:px-8 py-4 border-b border-[#abadae]/20">
        <div className="flex items-center gap-6 flex-1">
          <div className="relative w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-lg">
              search
            </span>
            <input
              className="w-full bg-[#eff1f2] dark:bg-neutral-800/50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4b41df]/20 outline-none"
              placeholder="Search subjects or students..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-8 mr-8">
            <button className="text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-600 text-sm py-1">
              Overview
            </button>
            <button className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 transition-colors text-sm py-1">
              Curriculum
            </button>
            <button className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 transition-colors text-sm py-1">
              Feedback
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <button className="p-2 text-neutral-500 hover:bg-neutral-200/50 rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-neutral-500 hover:bg-neutral-200/50 rounded-full transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="h-8 w-8 rounded-full overflow-hidden ml-2 ring-2 ring-[#4b41df]/10">
              <img
                alt="Teacher profile avatar"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuczftnkaRqIQmOtDrwrV1QVbbA8ynij-dLy1-Ex2ny9m-o2cuqFequlH8tUbu5Ro4tcno7GBgtnTaJ6sSSNv2TPD-M_1yyWDX_0RFqrF7nzxX8nUVLENNieMQ8ZVWPxR2xQvqIdZeZkwnGrberyt531lz6zaM-FT9kUjEKKKNpyBgAmJrfrzql6kgzIGCFWnhBYwTPwkyS08OAasGQ2w8XkeMe2E9VtCtungE9kSMtrGcfMp-y5bJxf-EXHvPMVDOV1Aj0Y2hCw"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 mt-8 space-y-10 max-w-full">
        {/* Classroom Overview */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="uppercase tracking-widest text-[12px] font-bold text-[#4b41df] mb-1 block">
                Institutional Insights
              </span>
              <h2 className="text-4xl font-black tracking-tight text-[#2c2f30]">Subject Analysis</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-500 font-medium hidden sm:block">Last synced: Today, 10:45 AM</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-[#ffffff] p-6 rounded-xl shadow-sm border border-[#abadae]/10 hover:shadow-md transition-shadow">
              <p className="uppercase tracking-widest text-[11px] font-bold text-neutral-500 mb-2">Total Students</p>
              <div className="flex items-end justify-between">
                <h3 className="text-4xl font-bold tracking-tighter text-[#2c2f30]">124</h3>
                <span className="material-symbols-outlined text-[#4b41df] text-3xl opacity-20">group</span>
              </div>
            </div>
            <div className="bg-[#ffffff] p-6 rounded-xl shadow-sm border-l-4 border-[#b41340] hover:shadow-md transition-shadow">
              <p className="uppercase tracking-widest text-[11px] font-bold text-[#b41340] mb-2">Critical Risk</p>
              <div className="flex items-end justify-between">
                <h3 className="text-4xl font-bold tracking-tighter text-[#b41340]">12</h3>
                <div className="bg-[#b41340]/10 px-2 py-1 rounded text-[10px] font-bold text-[#b41340]">+2 this week</div>
              </div>
            </div>
            <div className="bg-[#ffffff] p-6 rounded-xl shadow-sm border-l-4 border-[#983772] hover:shadow-md transition-shadow">
              <p className="uppercase tracking-widest text-[11px] font-bold text-[#983772] mb-2">Moderate Risk</p>
              <div className="flex items-end justify-between">
                <h3 className="text-4xl font-bold tracking-tighter text-[#983772]">45</h3>
                <span className="material-symbols-outlined text-[#983772] text-3xl opacity-20">warning</span>
              </div>
            </div>
            <div className="bg-[#ffffff] p-6 rounded-xl shadow-sm border-l-4 border-indigo-400 hover:shadow-md transition-shadow">
              <p className="uppercase tracking-widest text-[11px] font-bold text-indigo-400 mb-2">Stable Performance</p>
              <div className="flex items-end justify-between">
                <h3 className="text-4xl font-bold tracking-tighter text-indigo-400">67</h3>
                <span className="material-symbols-outlined text-indigo-400 text-3xl opacity-20">check_circle</span>
              </div>
            </div>
          </div>
        </section>

        {/* Topic Doubt Concentration */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-[#eff1f2] p-8 rounded-xl shadow-sm">
            <div className="flex md:items-center justify-between mb-8 flex-col md:flex-row gap-4">
              <div>
                <h3 className="text-2xl font-bold tracking-tight">Topic Doubt Concentration</h3>
                <p className="text-sm text-[#595c5d]">Proficiency mapping across core curricula</p>
              </div>
              <button className="text-[#4b41df] text-xs font-bold uppercase tracking-widest hover:underline md:self-auto self-start">
                View Curriculum Map
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading ? (
                <div className="col-span-1 md:col-span-2 text-center py-10 text-neutral-500 font-bold uppercase tracking-widest animate-pulse">Loading live records...</div>
              ) : (
                subjectsData.map((item, idx) => {
                  // dynamically decide colors
                  const colors = [
                    { border: 'border-l-4 border-[#b41340]', bgBadge: 'bg-[#b41340]/10 text-[#b41340]', bgBar: 'bg-[#b41340]', text: 'text-[#b41340]' },
                    { border: 'border-l-4 border-indigo-400', bgBadge: 'bg-indigo-400/10 text-indigo-500', bgBar: 'bg-indigo-400', text: 'text-indigo-400' },
                    { border: 'border-l-4 border-[#4b41df]', bgBadge: 'bg-[#4b41df]/10 text-[#4b41df]', bgBar: 'bg-[#4b41df]', text: 'text-[#4b41df]' },
                    { border: 'border-l-4 border-[#983772]', bgBadge: 'bg-[#983772]/10 text-[#983772]', bgBar: 'bg-[#983772]', text: 'text-[#983772]' }
                  ];
                  const color = colors[idx % colors.length];

                  return (
                    <div key={idx} className={`bg-[#ffffff] p-6 rounded-xl shadow-sm transition-transform hover:scale-[1.01] ${color.border}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-lg text-neutral-800">{item.subject}</h4>
                          <p className="text-xs text-neutral-500 font-medium">{item.topic}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${color.bgBadge}`}>
                          {item.pendingDoubts} Pending Doubts
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="uppercase tracking-widest text-neutral-400">Proficiency</span>
                          <span className={color.text}>{item.proficiency}%</span>
                        </div>
                        <div className="w-full bg-[#dadddf] h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${color.bgBar}`} style={{ width: `${item.proficiency}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Add New Subject Ghost Card */}
              <div className="border-2 border-dashed border-[#abadae]/30 p-6 rounded-xl flex flex-col items-center justify-center text-neutral-400 hover:border-[#4b41df]/40 hover:text-[#4b41df] transition-all cursor-pointer group">
                <span className="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform">add_circle</span>
                <span className="font-bold text-xs uppercase tracking-widest">Add Subject Analysis</span>
              </div>
            </div>
          </div>

          {/* Recent Activity / Trends */}
          <div className="bg-[#ffffff] p-8 rounded-xl shadow-sm border border-[#abadae]/10">
            <h3 className="text-xl font-bold mb-6 tracking-tight">Active Indicators</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#4b41df]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#4b41df]">trending_down</span>
                </div>
                <div>
                  <h5 className="text-sm font-bold">Rapid Decline Detected</h5>
                  <p className="text-xs text-neutral-500 mt-1">Class 12-B proficiency in Fluid Dynamics dropped by 14% this week.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#983772]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#983772]">chat_bubble</span>
                </div>
                <div>
                  <h5 className="text-sm font-bold">New Common Misconception</h5>
                  <p className="text-xs text-neutral-500 mt-1">8 students raised similar doubts regarding "Gibbs Free Energy" calculation.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-400/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-indigo-400">stars</span>
                </div>
                <div>
                  <h5 className="text-sm font-bold">Peer Tutor Potential</h5>
                  <p className="text-xs text-neutral-500 mt-1">Arjun Sharma achieved 100% in Differentiation. Consider as peer tutor.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-[#abadae]/10">
              <div className="relative overflow-hidden rounded-xl h-32 group">
                <img
                  alt="Technical classroom"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMI8AQY_ffkaEU5D8CY5OVSKX33dn5v_FxrSc9FMAxBPeS2G996dpWeTv5oxV5mf9pAKcP_gy2VFH8a1Xigr5UI60ODNrgdH_UKMk6ZSierlBNZaXMrfOUEKjZGxh2KIsw9_g_D-24OvooLMC34mJOa1tCf_S0KznuSNN2GkLUV0-A1wHT3XTnUuoM5_4R2PaQDL2840gn4kNS8qQPneneyXtqb_YDwsZhaPd7JVv4P-CV61Ly_7uruQCdh5nVl4DoDLwuTDqwLQ"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#4b41df]/90 to-transparent flex flex-col justify-end p-4">
                  <p className="text-white text-[10px] font-bold uppercase tracking-widest">Next Class Session</p>
                  <p className="text-white font-bold">Adv. Quantum Mech</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Student Risk Status Table/Grid */}
        <section className="bg-[#ffffff] rounded-xl shadow-sm border border-[#abadae]/10 overflow-hidden">
          <div className="p-4 md:p-8 border-b border-[#abadae]/10 flex flex-col md:flex-row items-start md:items-center justify-between bg-[#eff1f2]/30 gap-4">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Student Risk Status</h3>
              <p className="text-sm text-[#595c5d]">Real-time performance monitoring & topic struggle mapping</p>
            </div>
            <div className="flex gap-3 self-end md:self-auto">
              <button className="flex items-center gap-2 px-4 py-2 bg-[#e0e3e4] rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#dadddf] transition-colors">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#4b41df] text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#4b41df]/20 hover:opacity-90 transition-opacity">
                <span className="material-symbols-outlined text-sm">download</span>
                Export
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-[#eff1f2]/20 border-b border-[#abadae]/10">
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] font-black text-neutral-500">Student Profile</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] font-black text-neutral-500">Risk Matrix</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] font-black text-neutral-500">Friction Points</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] font-black text-neutral-500">Action Required</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] font-black text-neutral-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#abadae]/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm font-bold tracking-widest text-[#abadae] uppercase animate-pulse">Loading Risk Status...</td>
                  </tr>
                ) : (
                  studentRisks.map((student, i) => {
                    const levelColors = {
                      "Critical": "bg-[#b41340]/10 text-[#b41340]",
                      "Moderate": "bg-[#983772]/10 text-[#983772]",
                      "Stable": "bg-indigo-400/10 text-indigo-500"
                    };
                    const dotColors = {
                        "Critical": "bg-[#b41340]",
                        "Moderate": "bg-[#983772]",
                        "Stable": "bg-indigo-500"
                    };
                    
                    return (
                      <tr key={i} className="hover:bg-[#eff1f2]/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-600">
                              {student.initials}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-[#2c2f30]">{student.name}</p>
                              <p className="text-xs text-neutral-500">ID: {student.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${levelColors[student.level]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${dotColors[student.level]}`}></span>
                            {student.level}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {student.frictionPoints.map((fp, j) => (
                                <span key={j} className="px-2 py-1 bg-[#e0e3e4] rounded text-[10px] font-bold text-[#595c5d]">{fp}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-[#2c2f30]">{student.action}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{student.reference}</p>
                        </td>
                        <td className="px-6 py-4">
                          <button className="p-2 hover:bg-[#4b41df]/10 rounded-lg text-[#4b41df] transition-colors">
                            <span className="material-symbols-outlined">chevron_right</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-[#eff1f2]/30 border-t border-[#abadae]/10 flex justify-between items-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Showing 3 of 124 records</p>
            <div className="flex gap-1">
              <button className="p-1 rounded bg-[#ffffff] border border-[#abadae]/10 text-neutral-400 hover:text-[#4b41df] transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="p-1.5 rounded bg-[#ffffff] border border-[#abadae]/10 text-[#4b41df] font-bold text-[10px] w-6">1</button>
              <button className="p-1.5 rounded bg-[#ffffff] border border-[#abadae]/10 text-neutral-500 font-bold text-[10px] w-6 hover:bg-[#4b41df] hover:text-white transition-colors">2</button>
              <button className="p-1 rounded bg-[#ffffff] border border-[#abadae]/10 text-neutral-400 hover:text-[#4b41df] transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Contextual FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-[#4b41df] to-[#9895ff] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined text-2xl">chat</span>
      </button>
    </motion.div>
      </RoleProtectedRoute>
  );
}
