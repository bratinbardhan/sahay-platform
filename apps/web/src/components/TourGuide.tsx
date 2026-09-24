import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

export default function TourGuide() {
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
        setRun(true);
    };

    const handleDenyTour = () => {
        setShowPrompt(false);
        localStorage.setItem('sahay_tour_completed', 'true');
    };

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, index } = data;

        if (type === 'step:after' || type === 'error:target_not_found') {
            setStepIndex(index + (status === STATUS.FINISHED ? 0 : 1));
        }

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            setRun(false);
            localStorage.setItem('sahay_tour_completed', 'true');
        }
    };

    // DEFINE TOUR STEPS
    // The 'target' strings must match classNames added to your actual UI elements
    const steps: Step[] = [
        {
            target: 'body',
            content: 'Welcome to the Sahāy Platform! Let us take a quick tour of your clinical dashboard.',
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '.tour-sidebar',
            content: 'Navigate between your patients, analytics, and settings using this main menu.',
            placement: 'right',
        },
        {
            target: '.tour-analytics',
            content: 'View real-time patient statistics and therapy adherence metrics here.',
            placement: 'bottom',
        },
        {
            target: '.tour-profile',
            content: 'Manage your caretaker profile, demo settings, and logout from here.',
            placement: 'left',
        }
    ];

    return (
        <>
            {/* Top Banner Prompt asking for Tour */}
            {showPrompt && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-teal-600 text-white p-4 shadow-lg flex items-center justify-between animate-fade-in-down">
                    <div className="flex items-center gap-3">
                        <span className="flex h-3 w-3 rounded-full bg-white animate-pulse" />
                        <p className="font-medium text-sm">Welcome! Would you like a quick interactive tour of the platform features?</p>
                    </div>
                    <div className="flex gap-3 text-sm font-semibold">
                        <button onClick={handleDenyTour} className="px-4 py-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-teal-700 transition-colors">
                            Skip Tour
                        </button>
                        <button onClick={handleStartTour} className="px-4 py-1.5 rounded-lg bg-white text-teal-700 hover:bg-teal-50 transition-colors shadow-sm">
                            Start Tour
                        </button>
                    </div>
                </div>
            )}

            {/* Top Progress Indicator During Tour */}
            {run && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-5 py-2 rounded-full shadow-xl border border-slate-700 text-sm font-semibold flex items-center gap-2 animate-fade-in">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Tour Progress: Step {stepIndex + 1} of {steps.length}
                </div>
            )}

            {/* The Interactive Tour Guide Component */}
            <Joyride
                steps={steps}
                run={run}
                continuous={true}
                showProgress={false}
                showSkipButton={true}
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        primaryColor: '#0d9488',
                        textColor: '#334155',
                        backgroundColor: '#ffffff',
                        overlayColor: 'rgba(15, 23, 42, 0.6)',
                        zIndex: 1000,
                    },
                    tooltip: {
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        padding: '24px',
                    },
                    buttonNext: { borderRadius: '8px', padding: '10px 16px', fontWeight: 600 },
                    buttonBack: { color: '#64748b', marginRight: '8px' },
                    buttonSkip: { color: '#94a3b8' }
                }}
            />
        </>
    );
}
