import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const OwnerHospitalPatients = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [hospital, setHospital] = useState(null);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHospitalPatients();
    }, [id]);

    const fetchHospitalPatients = async () => {
        try {
            const response = await axios.get(`/admin/hospitals/${id}/patients`);
            setHospital(response.data.hospital);
            setPatients(response.data.patients);
        } catch (error) {
            toast.error('Failed to load hospital patients');
            navigate('/owner/hospitals');
        } finally {
            setLoading(false);
        }
    };

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
                        <Link to="/owner/hospitals" className="text-slate-500 hover:text-primary mb-4 inline-flex items-center transition-colors">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Hospitals
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                            {hospital?.name} <span className="text-slate-400 font-light">/</span> Patients
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Read-only view of patients at this hospital ({patients.length} total)
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card overflow-hidden"
                    >
                        {patients.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">No patients found</h3>
                                <p className="text-slate-500 mt-1">This hospital has no registered patients yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50/50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Age / Gender</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Blood Group</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Summary</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Emergency Contact</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {patients.map((patient) => (
                                            <tr key={patient._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mr-3">
                                                            {patient.fullName.charAt(0)}
                                                        </div>
                                                        <span className="font-semibold text-slate-900">{patient.fullName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{patient.age} / {patient.gender}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        {patient.bloodGroup}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={getRiskBadge(patient.riskLevel)}>
                                                        {patient.riskLevel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={patient.aiSummary}>
                                                    {patient.aiSummary || <span className="text-slate-400 italic">None</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    <div className="font-medium text-slate-900">{patient.emergencyContact.name}</div>
                                                    <div className="text-slate-500">{patient.emergencyContact.phone}</div>
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

export default OwnerHospitalPatients;
