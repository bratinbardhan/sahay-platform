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
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showFinishPrompt, setShowFinishPrompt] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('sahay_tour_completed');
    if (!tourCompleted) {
      setShowPrompt(true);
    }
  }, []);

  const handleStartTour = () => {
    setShowPrompt(false);
    setShowFinishPrompt(false);
    setStepIndex(0);
    setTimeout(() => setRun(true), 100);
  };

  const handleFinalClose = () => {
    setShowPrompt(false);
    setShowSkipConfirm(false);
    setShowFinishPrompt(false);
    localStorage.setItem('sahay_tour_completed', 'true');
    setStepIndex(0);
    setRun(false);
  };

  const handleResumeTour = () => {
    setShowSkipConfirm(false);
    setRun(true);
  };

  // 100% safe generic targets to prevent DOM crashes
  const steps: AppStep[] = [
    {
      target: 'body',
      content: 'Welcome to the Sahāy Clinical Dashboard! Let us take a comprehensive tour of your workspace.',
      placement: 'center',
      disableBeacon: true, 
      route: '/dashboard',
    },
    {
      target: 'body',
      content: 'This is your main Navigation Hub. Easily switch between Patients, Analytics, and Care Plans from here.',
      placement: 'center',
      disableBeacon: true,
      route: '/dashboard',
    },
    {
      target: 'body',
      content: 'The Patient Roster. Here you can monitor vitals, review daily adherence, and manage emergency protocols.',
      placement: 'center',
      disableBeacon: true,
      route: '/patients',
    },
    {
      target: 'body',
      content: 'The Analytics Engine. Visualize therapy adherence trends and generate clinical reports.',
      placement: 'center',
      disableBeacon: true,
      route: '/analytics',
    },
    {
      target: 'body',
      content: 'Your Caretaker Profile. Manage your account settings, switch roles, or log out securely.',
      placement: 'center',
      disableBeacon: true,
      route: '/dashboard',
    },
  ];

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
      if (nextStepIndex >= 0 && nextStepIndex < steps.length) {
        const nextRoute = steps[nextStepIndex].route;
        if (nextRoute && nextRoute !== location.pathname) {
          navigate(nextRoute);
        }
        setStepIndex(nextStepIndex);
      }
    }
  };

  const CustomTooltip = ({
    continuous,
    index,
    step,
    backProps,
    primaryProps,
    tooltipProps,
  }: TooltipRenderProps) => (
    <div
      {...tooltipProps}
      className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_16px_40px_rgba(13,148,136,0.15)] rounded-2xl p-5 max-w-sm relative text-slate-800"
    >
      <div className="relative z-10">
        {step.title && <h4 className="font-bold text-lg mb-2">{step.title}</h4>}
        <div className="text-sm font-medium leading-relaxed mb-4">{step.content}</div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-bold text-teal-700/80 tracking-widest uppercase bg-teal-100/50 px-2 py-1 rounded-md border border-teal-200/30">
            Step {index + 1}
          </span>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                {...backProps}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/50 hover:bg-white/80 border border-white/60 transition-colors"
              >
                Back
              </button>
            )}
            <button
              {...primaryProps}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-teal-600/90 text-white hover:bg-teal-700 border border-teal-500/50 transition-colors shadow-md"
            >
              {continuous ? (index === steps.length - 1 ? 'Done' : 'Next') : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {showPrompt && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-2xl bg-white/40 backdrop-blur-3xl border border-white/40 shadow-2xl rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-down">
          <div className="flex items-center gap-4 w-full">
            <div className="flex h-12 w-12 bg-white/80 backdrop-blur-md rounded-full items-center justify-center shrink-0 border border-white/80 shadow-sm">
              <span className="flex h-4 w-4 rounded-full bg-teal-500 animate-pulse shadow-[0_0_12px_rgba(20,184,166,0.8)]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base drop-shadow-sm">Sahāy Platform Tour</h3>
              <p className="text-xs md:text-sm text-slate-700 font-medium drop-shadow-sm">
                Would you like a quick walkthrough of your clinical tools?
              </p>
            </div>
          </div>
          <div className="flex gap-2 text-sm font-semibold shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={handleFinalClose}
              className="px-4 py-2.5 rounded-xl text-slate-700 hover:bg-white/50 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleStartTour}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-all"
            >
              Start Tour
            </button>
          </div>
        </div>
      )}

      {showSkipConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white/40 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.2)] border border-white/60 text-center">
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-slate-900 mb-2 drop-shadow-sm">Cancel Tour?</h3>
              <p className="text-sm text-slate-700 mb-6 font-medium">
                Are you sure you want to exit? You can always explore the features on your own.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleFinalClose}
                  className="flex-1 py-2.5 px-4 bg-white/50 hover:bg-white/80 text-slate-800 text-sm font-semibold rounded-xl transition-all border border-white/60 shadow-sm"
                >
                  Yes, Exit
                </button>
                <button
                  onClick={handleResumeTour}
                  className="flex-1 py-2.5 px-4 bg-teal-600/80 backdrop-blur-md hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-all border border-teal-500/50 shadow-lg shadow-teal-600/30"
                >
                  Resume Tour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFinishPrompt && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white/40 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.2)] border border-white/60 text-center">
            <div className="relative z-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-200/50 mb-4 text-emerald-700 shadow-inner">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 drop-shadow-sm"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 drop-shadow-sm">Tour Completed!</h3>
              <p className="text-sm text-slate-700 mb-6 font-medium">
                You are now ready to manage your patients. Do you want to review the tour again or head directly to your dashboard?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFinishPrompt(false);
                    setStepIndex(0);
                    setRun(true);
                  }}
                  className="flex-1 py-2.5 px-4 bg-white/50 hover:bg-white/80 text-slate-800 text-sm font-semibold rounded-xl transition-all border border-white/60 shadow-sm"
                >
                  Restart Tour
                </button>
                <button
                  onClick={handleFinalClose}
                  className="flex-1 py-2.5 px-4 bg-teal-600/80 backdrop-blur-md hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-all border border-teal-500/50 shadow-lg shadow-teal-600/30"
                >
                  Close & Begin
                </button>
              </div>
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
        steps={steps}
        styles={{ options: { zIndex: 10000, overlayColor: 'rgba(15, 23, 42, 0.4)' } }}
        tooltipComponent={CustomTooltip}
      />
    </>
  );
}