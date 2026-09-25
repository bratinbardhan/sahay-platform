import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS, TooltipRenderProps } from 'react-joyride';

interface AppStep extends Step {
  route?: string;
}

export default function TourGuide() {
  const navigate = useNavigate();
  const location = useLocation();

  const [run, setRun] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showFinishPrompt, setShowFinishPrompt] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeSteps, setActiveSteps] = useState<AppStep[]>([]);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('sahay_tour_completed');
    if (!tourCompleted) {
      setShowPrompt(true);
    }
  }, []);

  const handleStartTour = () => {
    setShowPrompt(false);
    setShowDeclineConfirm(false);
    setShowFinishPrompt(false);
    setStepIndex(0);
    setTimeout(() => setRun(true), 200);
  };

  const handleInitialDecline = () => {
    setShowPrompt(false);
    setShowDeclineConfirm(true);
  };

  const handleFinalClose = () => {
    setShowPrompt(false);
    setShowDeclineConfirm(false);
    setShowSkipConfirm(false);
    setShowFinishPrompt(false);
    localStorage.setItem('sahay_tour_completed', 'true');
    setStepIndex(0);
    setRun(false);
  };

  const handleResumeTour = () => {
    setShowDeclineConfirm(false);
    setShowSkipConfirm(false);
    setRun(true);
  };

  // 1. The Full 9-Step Deep Dive Mapping
  const rawSteps: AppStep[] = [
    {
      target: 'body',
      content: 'Welcome to the Sahāy Clinical Dashboard! Let us take a deep dive into your clinical tools.',
      placement: 'center',
      disableBeacon: true,
      route: '/dashboard',
    },
    {
      target: '.tour-sidebar',
      content: 'Your Navigation Hub. Switch seamlessly between your Dashboard, Patient Roster, and Analytics.',
      placement: 'right',
      disableBeacon: true,
      route: '/dashboard',
    },
    {
      target: '.tour-live-tracking',
      content: 'Active Patient Status. Instantly view the current patient and access their real-time GPS location via Live Tracking.',
      placement: 'bottom',
      disableBeacon: true,
      route: '/dashboard',
    },
    {
      target: '.tour-medication',
      content: 'Medication Scheduling. Track adherence in real-time, view upcoming doses, and schedule new alerts directly to the patient app.',
      placement: 'right',
      disableBeacon: true,
      route: '/dashboard',
    },
    {
      target: '.tour-hydration',
      content: 'Hydration & Vitals Monitoring. Keep a close eye on daily water intake and vital signs to ensure health goals are met.',
      placement: 'bottom',
      disableBeacon: true,
      route: '/dashboard',
    },
    {
      target: '.tour-media',
      content: 'Family Media Uploads. Upload photos and voice memos to help stimulate cognitive function and memory for dementia care.',
      placement: 'left',
      disableBeacon: true,
      route: '/dashboard',
    },
    {
      target: '.tour-patients-page',
      content: 'The Patient Roster. Manage your assigned patients, review detailed adherence metrics, and handle emergency protocols.',
      placement: 'center',
      disableBeacon: true,
      route: '/patients',
    },
    {
      target: '.tour-analytics-page',
      content: 'The Analytics Engine. Visualize long-term therapy adherence trends, cognitive game scores, and generate clinical reports.',
      placement: 'center',
      disableBeacon: true,
      route: '/analytics',
    },
    {
      target: '.tour-profile',
      content: 'Your Caretaker Profile. Manage your account settings, switch roles, or log out securely.',
      placement: 'left',
      disableBeacon: true,
      route: '/dashboard',
    },
  ];

  // 2. ANTI-CRASH SYSTEM: Fallback to 'body' if target UI class is missing
  useEffect(() => {
    const validateTargets = () => {
      const safeSteps = rawSteps.map((step) => {
        if (step.target === 'body') return step;
        
        // Scan the DOM for the specific class
        const elementExists = document.querySelector(step.target as string);
        
        return {
          ...step,
          // Route to 'body' if missing to prevent fatal crash
          target: elementExists ? step.target : 'body'
        };
      });
      setActiveSteps(safeSteps);
    };

    validateTargets();
    const timer = setTimeout(validateTargets, 400); 
    return () => clearTimeout(timer);
  }, [location.pathname, stepIndex]);

  // 3. SAFE ROUTING: Handle cross-page navigation safely
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;

    if (status === STATUS.SKIPPED) {
      setRun(false);
      setShowSkipConfirm(true);
      return;
    }

    if (status === STATUS.FINISHED) {
      setRun(false);
      setShowFinishPrompt(true);
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      if (nextStepIndex >= 0 && nextStepIndex < activeSteps.length) {
        const nextRoute = activeSteps[nextStepIndex].route;
        
        if (nextRoute && nextRoute !== location.pathname) {
          setRun(false); // Pause Joyride
          navigate(nextRoute); // Switch page
          setTimeout(() => {
            setStepIndex(nextStepIndex);
            setRun(true); // Resume after DOM loads
          }, 400); 
        } else {
          setStepIndex(nextStepIndex);
        }
      }
    }
  };

  // 4. THICK WHITE UI: Tooltip with bg-white/95 for maximum readability
  const CustomTooltip = ({ continuous, index, step, backProps, primaryProps, tooltipProps }: TooltipRenderProps) => (
    <div 
      {...tooltipProps} 
      className="bg-white/95 backdrop-blur-2xl border border-teal-100 shadow-[0_32px_64px_rgba(13,148,136,0.2)] rounded-3xl p-6 max-w-sm relative text-slate-900 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none"></div>
      <div className="relative z-10">
        {step.title && <h4 className="font-bold text-lg mb-2">{step.title}</h4>}
        <div className="text-sm font-medium leading-relaxed mb-5 text-slate-700">{step.content}</div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-bold text-teal-800 tracking-widest uppercase bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
            Step {index + 1} of {activeSteps.length}
          </span>
          <div className="flex gap-2">
            {index > 0 && (
              <button {...backProps} className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all shadow-sm">
                Back
              </button>
            )}
            <button {...primaryProps} className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 border border-teal-500 transition-all shadow-lg shadow-teal-600/30">
              {continuous ? (index === activeSteps.length - 1 ? 'Finish' : 'Next') : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Modal 1: Initial Prompt */}
      {showPrompt && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-2xl bg-white/95 backdrop-blur-2xl border border-teal-100 shadow-[0_24px_48px_rgba(13,148,136,0.15)] rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-down">
          <div className="flex items-center gap-4 w-full">
            <div className="flex h-12 w-12 bg-teal-50 rounded-full items-center justify-center shrink-0 border border-teal-100 shadow-sm">
              <span className="flex h-4 w-4 rounded-full bg-teal-500 animate-pulse shadow-[0_0_12px_rgba(20,184,166,0.8)]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base drop-shadow-sm">Sahāy Platform Tour</h3>
              <p className="text-sm text-slate-600 font-medium drop-shadow-sm">Would you like a detailed walkthrough of your clinical tools?</p>
            </div>
          </div>
          <div className="flex gap-2 text-sm font-semibold shrink-0 w-full md:w-auto justify-end">
            <button onClick={handleInitialDecline} className="px-5 py-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all">Decline</button>
            <button onClick={handleStartTour} className="px-6 py-2.5 rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition-all">Start Tour</button>
          </div>
        </div>
      )}

      {/* Modal 2: Decline Confirmation */}
      {showDeclineConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-3xl p-7 shadow-2xl border border-teal-100 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Skip Onboarding?</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Are you sure you want to skip the tour? You might miss out on important feature locations.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeclineConfirm(false); setShowPrompt(true); }} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-all shadow-sm">Go Back</button>
              <button onClick={handleFinalClose} className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-teal-600/30">Yes, Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Mid-Tour Skip/Exit */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-3xl p-7 shadow-2xl border border-teal-100 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Exit Tour?</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Are you sure you want to end the tour early? You can always explore on your own.</p>
            <div className="flex gap-3">
              <button onClick={handleFinalClose} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-all shadow-sm">End Tour</button>
              <button onClick={handleResumeTour} className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-teal-600/30">Resume</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Finish & Restart */}
      {showFinishPrompt && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-3xl p-7 shadow-2xl border border-teal-100 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 border border-teal-200 mb-5 text-teal-600 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Tour Completed!</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">You are now ready to manage your patients. Do you want to review the tour again or head directly to your workspace?</p>
            <div className="flex gap-3">
              <button onClick={handleStartTour} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-all shadow-sm">Restart</button>
              <button onClick={handleFinalClose} className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-teal-600/30">Close & Begin</button>
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