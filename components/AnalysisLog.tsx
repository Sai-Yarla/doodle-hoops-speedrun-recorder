import React from 'react';
import { AttemptRecord } from '../types';
import { downloadBlob } from '../utils/formatters';

interface AnalysisLogProps {
  logs: AttemptRecord[];
  onClear: () => void;
}

const AnalysisLog: React.FC<AnalysisLogProps> = ({ logs, onClear }) => {
  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
        <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Session History
        </h2>
        <button 
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition"
        >
          Clear
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <p>No attempts recorded yet.</p>
            <p className="text-xs mt-2">Start playing to populate this list.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div 
              key={log.id} 
              className={`flex items-start gap-4 p-3 rounded-md border transition-all ${
                log.status === 'saved' 
                  ? 'bg-green-900/20 border-green-800' 
                  : log.status === 'manual-review'
                  ? 'bg-blue-900/20 border-blue-800'
                  : 'bg-red-900/10 border-red-900/30 opacity-70'
              }`}
            >
              {/* Thumbnail */}
              <div className="w-24 h-16 bg-gray-900 rounded overflow-hidden flex-shrink-0 border border-gray-700 relative">
                {log.thumbnail ? (
                  <img src={log.thumbnail} alt="Attempt thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Preview</div>
                )}
                {log.status === 'saved' && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                )}
                {log.status === 'manual-review' && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-bold ${
                      log.status === 'saved' ? 'text-green-400' : 
                      log.status === 'manual-review' ? 'text-blue-300' : 'text-gray-400'
                    }`}>
                      Score: {log.score !== null ? log.score : '?'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                       log.status === 'saved' ? 'bg-green-900 text-green-300' : 
                       log.status === 'manual-review' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {log.status === 'manual-review' ? 'Saved (Review)' : log.status}
                    </span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="mt-2 flex gap-2">
                   {log.videoBlob && (
                     <button
                       onClick={() => log.videoBlob && downloadBlob(log.videoBlob, `hoops-${log.score !== null ? log.score : 'manual'}-${log.id}.webm`)}
                       className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                       </svg>
                       Download
                     </button>
                   )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnalysisLog;