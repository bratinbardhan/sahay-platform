import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';

// Extend the default Step type to accept a custom 'route' property
interface AppStep extends Step {
    route?: string;
}

export default function TourGuide() {
    const navigate = useNavigate();
    const location = useLocation();

    const [run, setRun] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        const tourCompleted = localStorage.getItem('sahay_tour_completed');
        if (!tourCompleted) {
            setShowPrompt(true);
        }
    }, []);

    const handleStartTour = () => {
        setShowPrompt(false);
        setStepIndex(0);
        setRun(true);
    };

    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [showFinishPrompt, setShowFinishPrompt] = useState(false);

    const handleFinalClose = () => {
        setShowPrompt(false);
        setShowSkipConfirm(false);
        setShowFinishPrompt(false);
        setRun(false);
        localStorage.setItem('sahay_tour_completed', 'true');
    };

    const handleResumeTour = () => {
        setShowSkipConfirm(false);
        setRun(true);
    };

    // DEFINE MULTI-PAGE STEPS
    // Update the 'route' strings to match your actual application URLs
    const steps: AppStep[] = [
        {
            target: 'body',
            content: 'Welcome to the Sahāy Platform! Let us take a quick tour of your clinical dashboard.',
            placement: 'center',
            disableBeacon: true,
            route: '/dashboard' // Starting point
        },
        {
            target: '.tour-sidebar',
            content: 'This is your main navigation menu. You can access all modules from here.',
            placement: 'right',
            route: '/dashboard'
        },
        {
            target: '.tour-patients-page',
            content: 'This is the Patient Roster. Here you can monitor all assigned individuals.',
            placement: 'center',
            route: '/patients' // Tour will auto-navigate to this page!
        },
        {
            target: '.tour-analytics-page',
            content: 'View real-time therapy adherence and clinical statistics here.',
            placement: 'center',
            route: '/analytics' // Tour will auto-navigate to this page!
        },
        {
            target: '.tour-profile',
            content: 'Manage your caretaker profile, demo settings, and logout from here.',
            placement: 'left',
            route: '/dashboard' // Back to dashboard
        }
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, action, index } = data;

        // End Tour Logic
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRun(false);
            localStorage.setItem('sahay_tour_completed', 'true');
            setStepIndex(0);
            return;
        }

        // Cross-Page Navigation Logic
        if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            // Determine if user clicked Next or Back
            const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);

            if (nextStepIndex >= 0 && nextStepIndex < steps.length) {
                const nextRoute = steps[nextStepIndex].route;

                // If the next step requires a different page, push the router to that page
                if (nextRoute && nextRoute !== location.pathname) {
                    navigate(nextRoute);
                }

                setStepIndex(nextStepIndex);
            }
        }
    };

    const joyrideLocale = { last: 'Done', skip: 'Skip Tour' };

    return (
        <>
            {/* Redesigned Floating Clinical Top Prompt */}
            {showPrompt && (
                <div className="fixed top-8 inset-x-0 mx-auto z-[99999] w-[90%] max-w-2xl bg-white/20 backdrop-blur-3xl border border-white/40 shadow-[0_32px_64px_rgba(13,148,136,0.15)] rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-down">
                    {/* Subtle glass shine overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-white/50 to-transparent pointer-events-none"></div>

                    <div className="flex items-center gap-4 w-full relative z-10">
                        <div className="flex h-12 w-12 bg-white/60 backdrop-blur-md rounded-full items-center justify-center shrink-0 border border-white/80 shadow-sm">
                            <span className="flex h-4 w-4 rounded-full bg-teal-500 animate-pulse shadow-[0_0_12px_rgba(20,184,166,0.8)]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm md:text-base drop-shadow-sm">Sahāy Platform Tour</h3>
                            <p className="text-xs md:text-sm text-slate-700 font-medium drop-shadow-sm">Would you like a quick walkthrough of your clinical tools?</p>
                        </div>
                    </div>
                    <div className="flex gap-2 text-sm font-semibold shrink-0 w-full md:w-auto justify-end relative z-10">
                        <button onClick={handleFinalClose} className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/50 transition-colors border border-transparent hover:border-white/50">
                            Decline
                        </button>
                        <button onClick={handleStartTour} className="px-5 py-2.5 rounded-xl bg-teal-600/80 backdrop-blur-md hover:bg-teal-600 text-white transition-all shadow-lg shadow-teal-600/30 border border-teal-500/50 hover:border-teal-400">
                            Start Tour
                        </button>
                    </div>
                </div>
            )}

            {showSkipConfirm && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 animate-fade-in">
                    <div className="w-full max-w-sm bg-white/40 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.2)] border border-white/60 relative overflow-hidden text-center">
                        <div className="absolute inset-0 bg-gradient-to-bl from-white/60 via-transparent to-white/20 pointer-events-none"></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-slate-900 mb-2 drop-shadow-sm">Cancel Tour?</h3>
                            <p className="text-sm text-slate-700 mb-6 font-medium">Are you sure you want to exit? You can always explore the features on your own.</p>
                            <div className="flex gap-3">
                                <button onClick={handleFinalClose} className="flex-1 py-2.5 px-4 bg-white/50 hover:bg-white/80 text-slate-800 text-sm font-semibold rounded-xl transition-all border border-white/60 shadow-sm">Yes, Exit</button>
                                <button onClick={handleResumeTour} className="flex-1 py-2.5 px-4 bg-teal-600/80 backdrop-blur-md hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-all border border-teal-500/50 shadow-lg shadow-teal-600/30">Resume Tour</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showFinishPrompt && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 animate-fade-in">
                    <div className="w-full max-w-sm bg-white/40 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.2)] border border-white/60 relative overflow-hidden text-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/60 via-transparent to-white/20 pointer-events-none"></div>
                        <div className="relative z-10">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-200/50 mb-4 text-emerald-700 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 drop-shadow-sm">Tour Completed!</h3>
                            <p className="text-sm text-slate-700 mb-6 font-medium">You are now ready to manage your patients. Do you want to review the tour again or head directly to your dashboard?</p>
                            <div className="flex gap-3">
                                <button onClick={() => { setShowFinishPrompt(false); setStepIndex(0); setRun(true); }} className="flex-1 py-2.5 px-4 bg-white/50 hover:bg-white/80 text-slate-800 text-sm font-semibold rounded-xl transition-all border border-white/60 shadow-sm">Restart Tour</button>
                                <button onClick={handleFinalClose} className="flex-1 py-2.5 px-4 bg-teal-600/80 backdrop-blur-md hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-all border border-teal-500/50 shadow-lg shadow-teal-600/30">Close & Begin</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fixed Light-Theme Progress Indicator */}
            {run && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-white/95 backdrop-blur-md text-teal-800 px-5 py-2.5 rounded-full shadow-lg border border-teal-200 text-sm font-bold flex items-center gap-3 animate-fade-in">
                    <div className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
                    Tour Progress: Step {stepIndex + 1} of {steps.length}
                </div>
            )}

            {/* Interactive Tour Guide */}
            <Joyride
                locale={joyrideLocale}
                steps={steps}
                run={run}
                stepIndex={stepIndex}
                continuous={true}
                showProgress={false}
                showSkipButton={true}
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        primaryColor: '#0d9488',
                        textColor: '#0f172a',
                        backgroundColor: '#ffffff',
                        overlayColor: 'rgba(15, 23, 42, 0.4)', // Softened overlay
                        zIndex: 1000,
                    },
                    tooltip: {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                        padding: '24px',
                    },
                    buttonNext: { borderRadius: '8px', padding: '10px 18px', fontWeight: 600 },
                    buttonBack: { color: '#64748b', marginRight: '8px' },
                    buttonSkip: { color: '#94a3b8' }
                }}
            />
        </>
    );
}
