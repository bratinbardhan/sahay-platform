// Mock expo-speech
type SpeechOptions = { language: VoiceConfig['language'] };

const Speech = {
  speak: (text: string, options: SpeechOptions): void => console.log('Speech:', text, options),
};

// Interfaces for Indic TTS/STT
export interface VoiceConfig {
  language: 'hi-IN' | 'bn-IN' | 'en-IN';
}

export class BhashiniVoiceService {
  private apiKey = process.env.EXPO_PUBLIC_BHASHINI_API_KEY;
  private pipelineId = process.env.EXPO_PUBLIC_BHASHINI_PIPELINE_ID;

  async speak(text: string, config: VoiceConfig): Promise<void> {
    if (!this.apiKey || !this.pipelineId) {
      this.fallbackSpeak(text, config);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      // Perform the actual API call (re-enabling simulation with actual fetch logic)
      const response = await fetch('https://api.bhashini.gov.in/v1/tts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Pipeline-ID': this.pipelineId
        },
        body: JSON.stringify({ text, config }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      clearTimeout(timeoutId);
    } catch (error) {
      console.warn('Bhashini TTS failed, falling back:', error);
      this.fallbackSpeak(text, config);
    }
  }

  private fallbackSpeak(text: string, config: VoiceConfig): void {
    Speech.speak(text, { language: config.language });
  }

  async listen(_config: VoiceConfig): Promise<string> {
    return 'Voice command recognized'; 
  }
}

export const bhashiniVoiceService = new BhashiniVoiceService();
