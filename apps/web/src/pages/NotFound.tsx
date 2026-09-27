import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#F5EFE6] to-[#FDFBF7] relative overflow-hidden">
            <div
                className="absolute inset-0 animate-organic-float opacity-70 pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%230f766e' fill-opacity='0.25'/%3E%3C/svg%3E")`,
                }}
            />
            <div className="relative z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-2xl border-2 border-white shadow-2xl shadow-slate-200/60 rounded-[2rem] p-12 max-w-lg text-center w-full mx-4 animate-in fade-in zoom-in-95 duration-500 ease-out">
                <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-slate-100 border border-white shadow-sm text-slate-700 animate-bounce">
                    <Compass className="w-8 h-8" />
                </div>
                <h1 className="text-8xl font-extrabold tracking-tighter text-slate-800 mb-4">404</h1>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-700 mb-3">Looks like you wandered off the map.</h2>
                <p className="text-slate-500 mb-10 leading-relaxed max-w-sm mx-auto">The page you are looking for doesn't exist or has been moved.</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-slate-900 text-white font-medium px-8 py-3.5 rounded-xl shadow-md shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-200"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
}
