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

    const handleDenyTour = () => {
        setShowPrompt(false);
        localStorage.setItem('sahay_tour_completed', 'true');
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

    return (
        <>
            {/* Redesigned Floating Clinical Top Prompt */}
            {showPrompt && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-down">
                    <div className="flex items-center gap-4 w-full">
                        <div className="flex h-12 w-12 bg-teal-50/80 rounded-full items-center justify-center shrink-0 border border-teal-100">
                            <span className="flex h-4 w-4 rounded-full bg-teal-500 animate-pulse shadow-[0_0_12px_rgba(20,184,166,0.6)]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm md:text-base">Sahāy Platform Tour</h3>
                            <p className="text-xs md:text-sm text-slate-600 font-medium">Would you like a quick walkthrough of your clinical tools?</p>
                        </div>
                    </div>
                    <div className="flex gap-2 text-sm font-semibold shrink-0 w-full md:w-auto justify-end">
                        <button onClick={handleDenyTour} className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 transition-colors">
                            Decline
                        </button>
                        <button onClick={handleStartTour} className="px-5 py-2.5 rounded-xl bg-teal-600/90 hover:bg-teal-700 text-white transition-all shadow-lg shadow-teal-600/20 backdrop-blur-sm">
                            Start Tour
                        </button>
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
