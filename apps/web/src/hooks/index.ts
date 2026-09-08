import { useMemo } from 'react';

/**
 * Localized greeting helper — detects time of day and returns
 * an English + Indic greeting pair.
 *
 * Time buckets:
 *   Morning   05:00–11:59
 *   Afternoon 12:00–16:59
 *   Evening   17:00–20:59
 *   Night     21:00–04:59
 */
export interface LocalizedGreeting {
  /** Primary English greeting, e.g. "Good morning, Ram". */
  primary: string;
  /** Subtitle with patient context. */
  subtitle: string;
  /** Indic greeting — Hindi/Bengali flavor. */
  indic: string;
  /** Icon-emoji hint for the time of day. */
  icon: string;
}

export function useLocalizedGreeting(
  caretakerName: string | undefined,
  patientName: string | undefined,
): LocalizedGreeting {
  return useMemo(() => {
    const hour = new Date().getHours();
    const name = caretakerName || 'Ram';
    const patient = patientName || 'Aditya';

    let period: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17 && hour < 21) period = 'evening';
    else period = 'night';

    const greetings: Record<typeof period, Omit<LocalizedGreeting, 'subtitle'>> = {
      morning: {
        primary: `Good morning, ${name}`,
        indic: `नमस्ते, ${name} · Shubh Prabhat`,
        icon: '🌅',
      },
      afternoon: {
        primary: `Good afternoon, ${name}`,
        indic: `नमस्ते, ${name} · Shubh Madhyahna`,
        icon: '☀️',
      },
      evening: {
        primary: `Good evening, ${name}`,
        indic: `नमस्ते, ${name} · Shubh Sandhya`,
        icon: '🌆',
      },
      night: {
        primary: `Good night, ${name}`,
        indic: `नमस्ते, ${name} · Shubh Ratri`,
        icon: '🌙',
      },
    };

    return {
      ...greetings[period],
      subtitle: `Here is ${patient}'s care overview today`,
    };
  }, [caretakerName, patientName]);
}
