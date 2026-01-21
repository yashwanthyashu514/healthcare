import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const AdminRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await axios.get('/admin/requests');
            // Filter out requests where patient data might be missing
            const validRequests = response.data.requests.filter(req => req.patient);
            setRequests(validRequests);
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await axios.post(`/admin/requests/${id}/approve`);
            toast.success('Request approved');
            // Notify sidebar to update count
            window.dispatchEvent(new Event('request-updated'));
            fetchRequests();
        } catch (error) {
            toast.error('Failed to approve request');
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Are you sure you want to reject this request?')) return;
        try {
            await axios.post(`/admin/requests/${id}/reject`);
            toast.success('Request rejected');
            // Notify sidebar to update count
            window.dispatchEvent(new Event('request-updated'));
            fetchRequests();
        } catch (error) {
            toast.error('Failed to reject request');
        }
    };

    const formatChanges = (request) => {
        const changes = request.requestedChanges;
        const patient = request.patient || {};

        return Object.entries(changes).map(([key, newValue]) => {
            const oldValue = patient[key];

            // Handle nested objects (like emergencyContact)
            if (typeof newValue === 'object' && newValue !== null) {
                return (
                    <div key={key} className="mb-4 col-span-2">
                        <span className="font-semibold capitalize text-slate-700 block mb-2">{key}:</span>
                        <div className="pl-4 border-l-2 border-slate-200">
                            {Object.entries(newValue).map(([subKey, subNewValue]) => {
                                const subOldValue = oldValue ? oldValue[subKey] : 'N/A';
                                if (JSON.stringify(subOldValue) === JSON.stringify(subNewValue)) return null;

                                return (
                                    <div key={subKey} className="grid grid-cols-2 gap-4 mb-2">
                                        <div>
                                            <span className="text-xs text-slate-500 uppercase font-medium">Old {subKey}</span>
                                            <div className="text-red-500 line-through text-sm">{String(subOldValue || 'N/A')}</div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 uppercase font-medium">New {subKey}</span>
                                            <div className="text-emerald-600 font-medium text-sm">{String(subNewValue)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }

            // Skip if value hasn't changed (though backend should only send changes)
            if (oldValue === newValue) return null;

            return (
                <div key={key} className="bg-white/50 p-3 rounded-lg border border-slate-200/60">
                    <span className="font-semibold capitalize text-slate-700 block mb-2 text-sm">{key}</span>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-medium">Old Value</span>
                            <div className="text-red-500 line-through break-all text-sm">{String(oldValue || 'N/A')}</div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase font-medium">New Value</span>
                            <div className="text-emerald-600 font-medium break-all text-sm">{String(newValue)}</div>
                        </div>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar />

            <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Edit Requests</h1>
                        <p className="text-slate-500 mt-1">Manage patient information update requests</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-16 glass-card">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No pending requests</h3>
                            <p className="text-slate-500 mt-1">All patient update requests have been processed</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {requests.map((request) => (
                                <motion.div
                                    key={request._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card p-6"
                                >
                                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 pb-6 border-b border-slate-100">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm mr-3">
                                                    {request.patient?.fullName?.charAt(0) || '?'}
                                                </span>
                                                {request.patient?.fullName || 'Unknown'}
                                            </h3>
                                            <div className="mt-1 ml-11 space-y-1">
                                                <p className="text-sm text-slate-500 flex items-center">
                                                    <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    Requested by: <span className="font-medium text-slate-700 ml-1">{request.hospital?.name || 'Unknown Hospital'}</span>
                                                </p>
                                                <p className="text-xs text-slate-400 flex items-center">
                                                    <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {new Date(request.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-3 mt-4 md:mt-0 ml-11 md:ml-0">
                                            <button
                                                onClick={() => handleReject(request._id)}
                                                className="px-4 py-2 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium shadow-sm"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleApprove(request._id)}
                                                className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors text-sm font-medium shadow-sm shadow-emerald-200"
                                            >
                                                Approve Changes
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Requested Changes
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {formatChanges(request)}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminRequests;
