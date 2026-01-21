import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const OwnerReports = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [allReports, setAllReports] = useState([]);
    const [filters, setFilters] = useState({
        hospital: '',
        reportType: '',
        riskLevel: ''
    });
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate('/dashboard');
            return;
        }
        fetchData();
    }, [isSuperAdmin]);

    const fetchData = async () => {
        try {
            const [reportsRes, hospitalsRes] = await Promise.all([
                axios.get('/admin/reports'),
                axios.get('/admin/hospitals')
            ]);
            setReports(reportsRes.data.reports);
            setAllReports(reportsRes.data.reports);
            setHospitals(hospitalsRes.data.hospitals);
        } catch (error) {
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Apply filters
        let filtered = [...allReports];

        if (filters.hospital) {
            filtered = filtered.filter(r => r.hospital?._id === filters.hospital);
        }
        if (filters.reportType) {
            filtered = filtered.filter(r => r.reportType === filters.reportType);
        }
        if (filters.riskLevel) {
            filtered = filtered.filter(r => r.patient?.riskLevel === filters.riskLevel);
        }

        setReports(filtered);
    }, [filters, allReports]);

    const getRiskBadge = (riskLevel) => {
        const badges = {
            High: 'bg-red-100 text-red-800 border-red-200',
            Medium: 'bg-amber-100 text-amber-800 border-amber-200',
            Low: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
        return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badges[riskLevel] || 'bg-slate-100 text-slate-800 border-slate-200'}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar />

            <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <Link to="/owner/dashboard" className="text-slate-500 hover:text-primary mb-4 inline-flex items-center transition-colors">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Global Patient Reports</h1>
                        <p className="text-slate-500 mt-1">View all medical reports across all hospitals ({reports.length} total)</p>
                    </div>

                    {/* Filters */}
                    <div className="glass-card p-6 mb-8">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Filter Reports</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Hospital</label>
                                <select
                                    value={filters.hospital}
                                    onChange={(e) => setFilters({ ...filters, hospital: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">All Hospitals</option>
                                    {hospitals.map(h => (
                                        <option key={h._id} value={h._id}>{h.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
                                <select
                                    value={filters.reportType}
                                    onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">All Types</option>
                                    <option value="Lab">Lab</option>
                                    <option value="Scan">Scan</option>
                                    <option value="Prescription">Prescription</option>
                                    <option value="Consultation">Consultation</option>
                                    <option value="Surgery">Surgery</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Risk Level</label>
                                <select
                                    value={filters.riskLevel}
                                    onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">All Levels</option>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Reports Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card overflow-hidden"
                    >
                        {reports.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">No reports found</h3>
                                <p className="text-slate-500 mt-1">Try adjusting your filters or check back later</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50/50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Report Title</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">File</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reports.map((report) => (
                                            <tr key={report._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-900">{report.title}</div>
                                                    {report.description && (
                                                        <div className="text-sm text-slate-500 mt-1 truncate max-w-xs">{report.description}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{report.patient?.fullName || 'N/A'}</div>
                                                    <div className="text-sm text-slate-500">{report.patient?.bloodGroup || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{report.hospital?.name || 'N/A'}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                        {report.reportType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={getRiskBadge(report.patient?.riskLevel)}>
                                                        {report.patient?.riskLevel || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {new Date(report.reportDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {report.reportFileUrl ? (
                                                        <a
                                                            href={report.reportFileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:text-primary-dark hover:underline text-sm font-medium inline-flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            View
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">No file</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default OwnerReports;
