
import React, { useState, useEffect } from 'react';
import { mechanicService } from '../src/services/mechanicService';
import type { BugReport } from '../src/core/types';

const BugReportModal: React.FC<{ reports: BugReport[], onClose: () => void }> = ({ reports, onClose }) => {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="bug-report-modal" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-yellow-400 flex items-center">
                        <span className="text-3xl mr-3">🔧</span> The Mechanic's Bug Report
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                {reports.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No bugs detected. System is running smoothly.</p>
                ) : (
                    <div className="space-y-4">
                        {reports.map(bug => (
                            <div key={bug.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                                <p className="font-mono text-red-500 text-sm break-words">
                                    <span className="font-bold">ERROR:</span> {bug.error.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    First seen: {new Date(bug.timestamp).toLocaleTimeString()} | Occurrences: {bug.count}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 mb-2 break-words">
                                    <span className="font-semibold">Context:</span> {bug.context}
                                </p>
                                <details className="bg-black bg-opacity-20 p-2 rounded mt-2 text-xs">
                                    <summary className="cursor-pointer text-gray-400 hover:text-white">Show Stack Trace</summary>
                                    <pre className="text-gray-500 mt-2 whitespace-pre-wrap break-all"><code>{bug.error.stack || "No stack trace available."}</code></pre>
                                </details>
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                    <h4 className="font-semibold text-sky-400 text-sm mb-1">Mechanic's Suggestion:</h4>
                                    {bug.isSuggestionLoading ? (
                                        <p className="text-gray-400 text-sm animate-pulse">Analyzing...</p>
                                    ) : (
                                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{bug.suggestion || "No suggestion available."}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const MechanicStatus: React.FC = () => {
    const [bugReports, setBugReports] = useState<BugReport[]>([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const handleUpdate = (db: Map<string, BugReport>) => {
            const sortedReports = Array.from(db.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setBugReports(sortedReports);
        };

        mechanicService.subscribe(handleUpdate);
        return () => mechanicService.unsubscribe(handleUpdate);
    }, []);

    const newBugCount = bugReports.filter(b => b.status === 'new').length;

    const handleWidgetClick = () => {
        setShowModal(true);
        // Mark all new bugs as seen when the modal is opened
        bugReports.forEach(bug => {
            if (bug.status === 'new') {
                mechanicService.markAsSeen(bug.id);
            }
        });
    };

    return (
        <>
            <div
                className="fixed bottom-4 left-4 z-50 p-3 bg-neutral-800 rounded-full shadow-lg cursor-pointer hover:bg-neutral-700 transition-colors border-2 border-neutral-600"
                onClick={handleWidgetClick}
                title="View Bug Reports"
            >
                <span className="text-2xl">🔧</span>
                {newBugCount > 0 && (
                    <div className="bug-report-badge">{newBugCount}</div>
                )}
            </div>
            {showModal && (
                <BugReportModal reports={bugReports} onClose={() => setShowModal(false)} />
            )}
        </>
    );
};

export default MechanicStatus;
