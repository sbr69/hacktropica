"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RoleProtectedRoute from '../../../components/RoleProtectedRoute';
import { motion } from 'framer-motion';
import { api } from '../../../services/api';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const MOCK_CURRICULUM = {
  "computer science": {
    "sem 1": ["programming", "maths"],
    "sem 2": ["data structures", "logic design"],
    "sem 3": ["algorithms", "dbms"],
    "sem 4": ["os", "networks"],
    "sem 5": ["ai", "soft computing"],
    "sem 6": ["cloud computing", "security"]
  }
};

const MOCK_ANALYTICS = {
  subjects: [
    { subject: "Data Structures", total_queries: 452, proficiency_score: 88 },
    { subject: "Operating Systems", total_queries: 318, proficiency_score: 74 },
    { subject: "Computer Networks", total_queries: 285, proficiency_score: 62 },
    { subject: "Database Management", total_queries: 512, proficiency_score: 91 },
    { subject: "Artificial Intelligence", total_queries: 198, proficiency_score: 56 }
  ],
  net_score: 76,
  total_students: 124,
  total_queries: 1765,
  stream: "Computer Science"
};

export default function StreamAnalytics() {
  const [selectedSemester, setSelectedSemester] = useState('sem 1');
  const [analyticsData, setAnalyticsData] = useState(MOCK_ANALYTICS);
  const [curriculum, setCurriculum] = useState(MOCK_CURRICULUM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch curriculum to populate semester dropdown
  useEffect(() => {
    api.filters.getFilters().then(data => {
      const curricData = data.curriculum || MOCK_CURRICULUM;
      setCurriculum(curricData);
      const allSemesters = new Set();
      Object.values(curricData).forEach(streamData => {
        Object.keys(streamData).forEach(sem => allSemesters.add(sem));
      });
      const semList = Array.from(allSemesters).sort();
      if (semList.length > 0 && !selectedSemester) {
        setSelectedSemester(semList[0]);
      }
    }).catch(() => {
        // Keep mock data if API fails
        setCurriculum(MOCK_CURRICULUM);
    });
  }, []);

  // Fetch analytics when semester changes
  useEffect(() => {
    if (!selectedSemester) return;
    setLoading(true);
    setError(null);
    api.analytics.stream(selectedSemester)
      .then(data => {
        setAnalyticsData(data || MOCK_ANALYTICS);
        setLoading(false);
      })
      .catch(err => {
        // Fallback to mock data on error for demo purposes
        setAnalyticsData(MOCK_ANALYTICS);
        setLoading(false);
      });
  }, [selectedSemester]);

  // Derive semester list from curriculum
  const allSemesters = new Set();
  Object.values(curriculum).forEach(streamData => {
    if (typeof streamData === 'object') {
      Object.keys(streamData).forEach(sem => allSemesters.add(sem));
    }
  });
  const semesterList = Array.from(allSemesters).sort();

  const subjects = analyticsData?.subjects || [];
  const netScore = analyticsData?.net_score || 0;
  const totalStudents = analyticsData?.total_students || 0;
  const totalQueries = analyticsData?.total_queries || 0;
  const streamName = analyticsData?.stream || 'N/A';

  return (
    <RoleProtectedRoute routeName="stream-analytics">
      <motion.main 
        className="p-4 md:p-8 space-y-8 w-full font-['Space_Grotesk'] text-[#2c2f30]"
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        {/* Page Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-neutral-200 pb-6 w-full">
          <div>
            <span className="uppercase tracking-widest text-[12px] font-bold text-primary-600 mb-1 block">
              HOD Overview
            </span>
            <h2 className="text-3xl font-black tracking-tight text-neutral-900">Stream Analytics</h2>
            <p className="text-sm md:text-base text-neutral-500 mt-2 font-medium">
              Monitor subject-wise proficiency and query patterns for your stream.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider">Stream:</span>
              <span className="text-xs font-bold bg-neutral-100 border border-neutral-200 rounded-lg py-2 px-4 text-neutral-700 uppercase">{streamName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider">Students:</span>
              <span className="text-xs font-bold bg-primary-50 border border-primary-200 rounded-lg py-2 px-4 text-primary-700">{totalStudents}</span>
            </div>
          </div>
        </section>

        {/* Top Section: Subject Understanding Analysis & Net Score Circle */}
        <div className="bg-white rounded-xl p-6 md:p-8 border border-neutral-200 shadow-sm w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4 sm:gap-0 border-b border-neutral-200/50 pb-6">
            <h3 className="text-lg font-bold flex items-center gap-3 text-neutral-900">
              <span className="material-symbols-outlined text-primary-600 bg-white p-2 rounded-lg shadow-sm">monitoring</span>
              Subject Understanding Analysis
            </h3>
            
            <div className="flex items-center gap-2 relative z-20">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider hidden sm:block">Sem:</span>
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between gap-1 text-xs font-bold bg-white border border-neutral-200 rounded-md py-1.5 px-2.5 focus:outline-none hover:bg-neutral-50 focus:ring-2 focus:ring-primary-500 w-24 text-neutral-800 shadow-sm transition-colors"
                >
                  <span className="uppercase">{selectedSemester || 'Select'}</span>
                  <span className="material-symbols-outlined text-[16px] text-neutral-500">
                    {isDropdownOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-1 w-24 bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden z-40 py-1">
                      {semesterList.map(sem => (
                        <button
                          key={sem}
                          className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-bold uppercase transition-colors hover:bg-neutral-50 ${
                            selectedSemester === sem ? 'text-primary-600 bg-primary-50/50' : 'text-neutral-700'
                          }`}
                          onClick={() => {
                            setSelectedSemester(sem);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <span>{sem}</span>
                          {selectedSemester === sem && (
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 w-full flex flex-col space-y-6">
              {[
                { name: "Data Structures & Algorithms", mastery: 92 },
                { name: "Operating Systems", mastery: 78 },
                { name: "Database Management", mastery: 85 },
                { name: "Discrete Mathematics", mastery: 64 }
              ].map((item, idx) => {
                 let textColor = '';
                 let barColor = 'bg-[#5665b1]';
                 
                 if (item.mastery >= 80) textColor = 'text-[#268e54]';
                 else if (item.mastery >= 70) textColor = 'text-[#5665b1]';
                 else textColor = 'text-[#9fa8b8]';

                 return (
                   <div key={idx} className="flex flex-col space-y-2.5">
                     <div className="flex justify-between items-center font-bold">
                        <span className="text-[#515a6b] text-[15px]">{item.name}</span>
                        <span className={`${textColor} text-[15px]`}>{item.mastery}% Mastery</span>
                     </div>
                     <div className="w-full bg-neutral-100 rounded-full h-[11px] overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${item.mastery}%` }}></div>
                     </div>
                   </div>
                 );
              })}
            </div>

            {/* Right: Circular Graph */}
            <div className="relative shrink-0 flex items-center justify-center p-4 lg:p-8">
              <div className="relative w-56 h-56 flex items-center justify-center">
                {/* Background Track */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="44" 
                    fill="transparent" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    className="text-neutral-100" 
                  />
                  {/* Progress Arc: r=44 means circumference = 2 * PI * 44 = 276.46 */}
                  <circle 
                    cx="50" cy="50" r="44" 
                    fill="transparent" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray="276.46" 
                    strokeDashoffset={276.46 - (87.6 / 100) * 276.46}
                    className="text-primary-600 transition-all duration-1000 ease-out" 
                  />
                </svg>
                {/* Center Content */}
                <div className="relative z-10 text-center flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-neutral-900 tracking-tighter" style={{ lineHeight: '1.1' }}>87.6%</span>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Avg Score</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Query Stats Summary */}
        {analyticsData && !loading && (
          <div className="w-full mt-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary-600 bg-primary-50 p-2 rounded-lg text-xl">query_stats</span>
                  <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Total Queries</span>
                </div>
                <p className="text-4xl font-black text-neutral-900">{totalQueries.toLocaleString()}</p>
                <p className="text-xs text-neutral-400 mt-2">Across all subjects in {selectedSemester.toUpperCase()}</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 p-2 rounded-lg text-xl">school</span>
                  <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Students</span>
                </div>
                <p className="text-4xl font-black text-neutral-900">{totalStudents}</p>
                <p className="text-xs text-neutral-400 mt-2">Enrolled in the {streamName.toUpperCase()} stream</p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2 rounded-lg text-xl">trending_up</span>
                  <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Net Proficiency</span>
                </div>
                <p className={`text-4xl font-black ${netScore >= 75 ? 'text-emerald-600' : netScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{netScore}%</p>
                <p className="text-xs text-neutral-400 mt-2">Average across {subjects.length} subjects</p>
              </div>
            </div>
          </div>
        )}

      </motion.main>
    </RoleProtectedRoute>
  );
}
