import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center p-6 w-full">
            <div className="flex flex-col items-center justify-center bg-white/30 backdrop-blur-xl border border-white/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.1)] rounded-3xl p-12 max-w-lg text-center w-full">
                <div className="w-16 h-16 bg-slate-100/50 rounded-full flex items-center justify-center mb-6 text-slate-800">
                    <Compass className="w-8 h-8" />
                </div>
                <h1 className="text-7xl font-bold text-slate-800 mb-4">404</h1>
                <h2 className="text-xl font-semibold text-slate-700 mb-2">Looks like you wandered off the map.</h2>
                <p className="text-slate-500 mb-8">The page you are looking for doesn't exist or has been moved.</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
}
