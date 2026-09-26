import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS, TooltipRenderProps } from 'react-joyride';

interface AppStep extends Step { route?: string; }

export default function TourGuide() {
    const navigate = useNavigate();
    const location = useLocation();

    const [run, setRun] = useState(false);
    const [showFinishPrompt, setShowFinishPrompt] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [activeSteps, setActiveSteps] = useState<AppStep[]>([]);

    useEffect(() => {
        if (!localStorage.getItem('sahay_tour_completed')) {
            setStepIndex(0);
            setTimeout(() => setRun(true), 200);
        }
    }, []);

    const handleStartTour = () => {
        setShowFinishPrompt(false);
        setStepIndex(0);
        if (location.pathname !== '/') {
            navigate('/');
            setTimeout(() => setRun(true), 400);
        } else {
            setTimeout(() => setRun(true), 200);
        }
    };

    const handleFinalClose = () => {
        setShowFinishPrompt(false);
        localStorage.setItem('sahay_tour_completed', 'true');
        setStepIndex(0); setRun(false);
    };

    const rawSteps: AppStep[] = [
        { target: 'body', title: 'Welcome to Sahāy', content: 'Let us take a deep dive into your clinical tools.', placement: 'center', disableBeacon: true, route: '/' },
        { target: '.tour-sidebar', title: 'Navigation Hub', content: 'Switch seamlessly between your Dashboard, Care Circle, and Analytics.', placement: 'right', disableBeacon: true, route: '/' },
        { target: '.tour-live-tracking', title: 'Active Patient & Live Tracking', content: 'View current patient status and access real-time GPS location.', placement: 'bottom', disableBeacon: true, route: '/' },
        { target: '.tour-medication', title: 'Medication Scheduling', content: 'Track adherence and schedule new alerts directly to the patient app.', placement: 'right', disableBeacon: true, route: '/' },
        { target: '.tour-hydration', title: 'Hydration & Vitals', content: 'Keep a close eye on daily water intake and vital signs.', placement: 'bottom', disableBeacon: true, route: '/' },
        { target: '.tour-media', title: 'Family Media Uploads', content: 'Upload photos and voice memos to help stimulate cognitive function.', placement: 'left', disableBeacon: true, route: '/' },
        { target: '.tour-care-circle', title: 'Care Circle', content: 'Manage your assigned patients and review emergency protocols.', placement: 'center', disableBeacon: true, route: '/' },
        { target: '.tour-geofence', title: 'Geofence Map', content: 'Monitor patient boundaries and receive alerts if they wander.', placement: 'center', disableBeacon: true, route: '/geofence' },
        { target: '.tour-analytics-chart', title: 'The Analytics Engine', content: 'Visualize long-term therapy adherence trends and cognitive scores.', placement: 'bottom', disableBeacon: true, route: '/analytics' },
        { target: '.tour-print-btn', title: 'Print Reports', content: 'Export and print detailed clinical analytics for physical records.', placement: 'bottom-end', disableBeacon: true, route: '/analytics' },
        { target: '.tour-profile', title: 'Caretaker Profile', content: 'Manage your account settings and switch active caretaker roles.', placement: 'bottom-start', disableBeacon: true, route: '/' },
        { target: '.tour-logout', title: 'Secure Log Out', content: 'Securely log out of your caretaker session.', placement: 'right', disableBeacon: true, route: '/' },
    ];

    useEffect(() => {
        const validateTargets = () => {
            const safeSteps = rawSteps.map((step) => {
                if (step.target === 'body') return step;
                const el = document.querySelector(step.target as string);
                return el ? step : { ...step, target: 'body', placement: 'center' as const };
            });
            setActiveSteps(safeSteps);
        };
        validateTargets();
        const timer = setTimeout(validateTargets, 400);
        return () => clearTimeout(timer);
    }, [location.pathname, stepIndex]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, action, index } = data;

        if (status === STATUS.FINISHED || type === EVENTS.TOUR_END) {
            setRun(false); setShowFinishPrompt(true); return;
        }
        if (status === STATUS.SKIPPED) {
            setRun(false); handleFinalClose(); return;
        }

        if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            if (action === ACTIONS.NEXT && index === activeSteps.length - 1) {
                setRun(false);
                setShowFinishPrompt(true);
                return;
            }

            const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
            if (nextStepIndex >= 0 && nextStepIndex < activeSteps.length) {
                const nextRoute = activeSteps[nextStepIndex].route;
                if (nextRoute && nextRoute !== location.pathname) {
                    setRun(false); navigate(nextRoute);
                    setTimeout(() => { setStepIndex(nextStepIndex); setRun(true); }, 400);
                } else {
                    setStepIndex(nextStepIndex);
                }
            }
        }
    };

    const CustomTooltip = ({ continuous, index, step, backProps, primaryProps, tooltipProps }: TooltipRenderProps) => (
        <div {...tooltipProps} className="bg-white/95 backdrop-blur-2xl border border-teal-100 shadow-[0_32px_64px_rgba(13,148,136,0.2)] rounded-3xl p-6 max-w-sm relative text-slate-900 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
                {step.title && <h4 className="font-bold text-lg mb-2">{step.title}</h4>}
                <div className="text-sm font-medium leading-relaxed mb-5 text-slate-700">{step.content}</div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-teal-800 tracking-widest uppercase bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">Step {index + 1} of {activeSteps.length}</span>
                    <div className="flex gap-2">
                        {index > 0 && <button {...backProps} className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-sm">Back</button>}
                        <button {...primaryProps} className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 border border-teal-500 shadow-lg shadow-teal-600/30">{continuous ? (index === activeSteps.length - 1 ? 'Finish' : 'Next') : 'Close'}</button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {showFinishPrompt && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-3xl p-7 shadow-2xl border border-teal-100 text-center">
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Tour Completed!</h3>
                        <p className="text-sm text-slate-600 mb-6 font-medium">You are now ready to manage your patients.</p>
                        <div className="flex gap-3">
                            <button onClick={handleStartTour} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl">Restart</button>
                            <button onClick={handleFinalClose} className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl">Close & Begin</button>
                        </div>
                    </div>
                </div>
            )}
            <Joyride
                callback={handleJoyrideCallback}
                continuous={true}
                run={run}
                showSkipButton={true}
                stepIndex={stepIndex}
                steps={activeSteps}
                styles={{ options: { zIndex: 10000, overlayColor: 'rgba(15, 23, 42, 0.4)' } }}
                tooltipComponent={CustomTooltip}
            />
        </>
    );
}