import React, { useState } from 'react';
import Recorder from './components/Recorder';
import AnalysisLog from './components/AnalysisLog';
import { AttemptRecord } from './types';

const App: React.FC = () => {
  const [logs, setLogs] = useState<AttemptRecord[]>([]);

  const handleLogEntry = (entry: AttemptRecord) => {
    setLogs(prev => [entry, ...prev]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100 font-sans selection:bg-purple-500/30">
      <header className="flex-none p-6 border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Gemini Hoops Recorder
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Automated Google Doodle Basketball recording using Multimodal AI.
            </p>
          </div>
          <div className="text-xs text-right text-gray-500">
            <p>Target Score: <span className="text-white font-mono">45+</span></p>
            <p>Model: <span className="text-white font-mono">gemini-3-flash</span></p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-full min-h-[400px]">
          <Recorder onLogEntry={handleLogEntry} />
        </div>
        <div className="lg:col-span-1 h-full min-h-[400px]">
          <AnalysisLog logs={logs} onClear={handleClearLogs} />
        </div>
      </main>

      <footer className="flex-none p-4 text-center text-xs text-gray-600 border-t border-gray-900">
        <p>
          Note: Requires a supported browser for Screen Capture API. 
          Keep the game visible on screen for AI analysis.
        </p>
      </footer>
    </div>
  );
};

export default App;