'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function RemarksChart({ clocklogs, isFetchingData }) {
  const [inChartData, setInChartData] = useState(null);
  const [outChartData, setOutChartData] = useState(null);

  useEffect(() => {
    if (!clocklogs || clocklogs.length === 0 || isFetchingData) return;

    // Process data for clock in remarks
    const inRemarks = {};
    const outRemarks = {};

    clocklogs.forEach(log => {
      // Count clock in remarks
      if (log.INstatus) {
        inRemarks[log.INstatus] = (inRemarks[log.INstatus] || 0) + 1;
      }

      // Count clock out remarks
      if (log.OUTstatus) {
        outRemarks[log.OUTstatus] = (outRemarks[log.OUTstatus] || 0) + 1;
      }
    });

    // Prepare chart data for clock in remarks
    const inLabels = Object.keys(inRemarks);
    const inValues = Object.values(inRemarks);
    const inColors = inLabels.map(label => getStatusColor(label, 'bar'));
    const inBorderColors = inLabels.map(label => getStatusColor(label, 'border'));

    setInChartData({
      labels: inLabels,
      datasets: [
        {
          label: 'Clock In Remarks',
          data: inValues,
          backgroundColor: inColors,
          borderColor: inBorderColors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: inColors.map(color => adjustColor(color, -20)),
          hoverBorderColor: inBorderColors.map(color => adjustColor(color, -20)),
        },
      ],
    });

    // Prepare chart data for clock out remarks
    const outLabels = Object.keys(outRemarks);
    const outValues = Object.values(outRemarks);
    const outColors = outLabels.map(label => getStatusColor(label, 'bar'));
    const outBorderColors = outLabels.map(label => getStatusColor(label, 'border'));

    setOutChartData({
      labels: outLabels,
      datasets: [
        {
          label: 'Clock Out Remarks',
          data: outValues,
          backgroundColor: outColors,
          borderColor: outBorderColors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: outColors.map(color => adjustColor(color, -20)),
          hoverBorderColor: outBorderColors.map(color => adjustColor(color, -20)),
        },
      ],
    });
  }, [clocklogs, isFetchingData]);

  // Helper function to adjust color brightness
  const adjustColor = (color, amount) => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Get colors for different status types
  const getStatusColor = (status, type = 'bar') => {
    const colors = {
      'Early IN': {
        bar: '#10b981',
        border: '#059669',
        bg: '#d1fae5',
        text: '#065f46'
      },
      'On Time': {
        bar: '#3b82f6',
        border: '#2563eb',
        bg: '#dbeafe',
        text: '#1e40af'
      },
      'Late': {
        bar: '#ef4444',
        border: '#dc2626',
        bg: '#fee2e2',
        text: '#991b1b'
      },
      'Missed': {
        bar: '#dc2626',
        border: '#b91c1c',
        bg: '#fecaca',
        text: '#7f1d1d'
      },
      'Late out': {
        bar: '#f59e0b',
        border: '#d97706',
        bg: '#fef3c7',
        text: '#92400e'
      }
    };

    return colors[status]?.[type] || (type === 'bar' ? '#6b7280' : '#374151');
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(20, 32, 110, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#14206e',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          },
          padding: 8,
        },
        border: {
          color: '#e5e7eb',
          width: 1,
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#374151',
          font: {
            size: 12,
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          },
          padding: 8,
        },
        border: {
          color: '#e5e7eb',
          width: 1,
        }
      },
    },
    elements: {
      bar: {
        borderRadius: 8,
      },
    },
  };

  // Get unique remarks for legend
  const getUniqueRemarks = () => {
    const inRemarks = new Set();
    const outRemarks = new Set();

    clocklogs.forEach(log => {
      if (log.INstatus) inRemarks.add(log.INstatus);
      if (log.OUTstatus) outRemarks.add(log.OUTstatus);
    });

    return { inRemarks: Array.from(inRemarks), outRemarks: Array.from(outRemarks) };
  };

  const { inRemarks, outRemarks } = getUniqueRemarks();

  return (
    <div className="bg-white shadow-lg rounded-2xl p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-[#14206e] mb-6 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        Attendance Remarks Statistics
      </h2>

      {isFetchingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14206e] mr-4"></div>
          <div className="text-center">
            <p className="text-[#14206e] font-medium">Loading charts...</p>
            <p className="text-sm text-gray-600">Please wait while we process the data</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clock In Remarks Chart */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold text-[#14206e] mb-4">Clock In Remarks</h3>
              <div className="flex flex-col gap-4">
                <div className="h-64">
                  {inChartData ? (
                    <Bar data={inChartData} options={chartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No data available
                    </div>
                  )}
                </div>
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {inRemarks.map(remark => (
                      <div key={remark} className="flex items-center">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: getStatusColor(remark, 'bg'),
                            color: getStatusColor(remark, 'text')
                          }}
                        >
                          {remark}
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                          ({clocklogs.filter(log => log.INstatus === remark).length})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Clock Out Remarks Chart */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
              <h3 className="text-lg font-semibold text-[#14206e] mb-4">Clock Out Remarks</h3>
              <div className="flex flex-col gap-4">
                <div className="h-64">
                  {outChartData ? (
                    <Bar data={outChartData} options={chartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No data available
                    </div>
                  )}
                </div>
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {outRemarks.map(remark => (
                      <div key={remark} className="flex items-center">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: getStatusColor(remark, 'bg'),
                            color: getStatusColor(remark, 'text')
                          }}
                        >
                          {remark}
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                          ({clocklogs.filter(log => log.OUTstatus === remark).length})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-[#14206e] mb-2">On Time Rate</h4>
              <p className="text-2xl font-bold text-green-600">
                {(() => {
                  const onTimeCount = clocklogs.filter(log => log.INstatus === 'On Time').length;
                  const totalCount = clocklogs.filter(log => log.INstatus).length;
                  return totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0;
                })()}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <h4 className="font-medium text-[#14206e] mb-2">Late Rate</h4>
              <p className="text-2xl font-bold text-red-600">
                {(() => {
                  const lateCount = clocklogs.filter(log => log.INstatus === 'Late').length;
                  const totalCount = clocklogs.filter(log => log.INstatus).length;
                  return totalCount > 0 ? Math.round((lateCount / totalCount) * 100) : 0;
                })()}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-[#14206e] mb-2">Missed Out Rate</h4>
              <p className="text-2xl font-bold text-yellow-600">
                {(() => {
                  const missedCount = clocklogs.filter(log => log.OUTstatus === 'Missed').length;
                  const totalCount = clocklogs.filter(log => log.OUTstatus).length;
                  return totalCount > 0 ? Math.round((missedCount / totalCount) * 100) : 0;
                })()}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 