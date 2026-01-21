import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const OwnerHospitalList = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [hospitals, setHospitals] = useState([]);
    const [filter, setFilter] = useState('PENDING');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate('/dashboard');
            return;
        }
        fetchHospitals();
    }, [filter, isSuperAdmin]);

    const fetchHospitals = async () => {
        try {
            const response = await axios.get('/hospitals');
            let hospitalData = response.data.hospitals;

            if (filter) {
                hospitalData = hospitalData.filter(h => h.status === filter);
            }

            setHospitals(hospitalData);
        } catch (error) {
            toast.error('Failed to load hospitals');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id, name) => {
        if (!window.confirm(`Approve hospital: ${name}?`)) {
            return;
        }

        try {
            await axios.patch(`/hospitals/${id}/approve`);
            toast.success('Hospital approved successfully');
            fetchHospitals();
        } catch (error) {
            toast.error('Failed to approve hospital');
        }
    };

    const handleReject = async (id, name) => {
        if (!window.confirm(`Reject hospital: ${name}?`)) {
            return;
        }

        try {
            await axios.patch(`/hospitals/${id}/reject`);
            toast.success('Hospital rejected');
            fetchHospitals();
        } catch (error) {
            toast.error('Failed to reject hospital');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
            APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            REJECTED: 'bg-red-100 text-red-800 border-red-200'
        };
        return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badges[status] || 'bg-slate-100 text-slate-800 border-slate-200'}`;
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
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hospital Management</h1>
                        <p className="text-slate-500 mt-1">System Owner Portal - Approve or reject hospital registrations</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="mb-6 flex space-x-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit">
                        {['PENDING', 'APPROVED', 'REJECTED', ''].map((status) => (
                            <button
                                key={status || 'ALL'}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${filter === status
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                {status || 'ALL'}
                            </button>
                        ))}
                    </div>

                    {/* Hospitals Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card overflow-hidden"
                    >
                        {hospitals.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">No hospitals found</h3>
                                <p className="text-slate-500 mt-1">No {filter.toLowerCase()} hospitals match your criteria</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50/50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin User</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patients</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {hospitals.map((hospital) => (
                                            <tr key={hospital._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{hospital.name}</div>
                                                        <div className="text-sm text-slate-500">{hospital.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    <div>{hospital.phone || 'N/A'}</div>
                                                    <div className="text-slate-500">{hospital.primaryContactName || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <div className="font-medium text-slate-900">{hospital.adminUser?.name || 'N/A'}</div>
                                                        <div className="text-slate-500">{hospital.adminUser?.email || 'N/A'}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        to={`/owner/hospitals/${hospital._id}/patients`}
                                                        className="inline-flex items-center space-x-1 text-primary hover:text-primary-dark hover:underline font-medium"
                                                    >
                                                        <span>{hospital.patientCount || 0}</span>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={getStatusBadge(hospital.status)}>
                                                        {hospital.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end space-x-2">
                                                        {hospital.status === 'PENDING' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(hospital._id, hospital.name)}
                                                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium shadow-sm"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReject(hospital._id, hospital.name)}
                                                                    className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        {hospital.status === 'APPROVED' && (
                                                            <button
                                                                onClick={() => handleReject(hospital._id, hospital.name)}
                                                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium"
                                                            >
                                                                Revoke
                                                            </button>
                                                        )}
                                                        {hospital.status === 'REJECTED' && (
                                                            <button
                                                                onClick={() => handleApprove(hospital._id, hospital.name)}
                                                                className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-xs font-medium shadow-sm"
                                                            >
                                                                Re-approve
                                                            </button>
                                                        )}
                                                    </div>
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

export default OwnerHospitalList;
