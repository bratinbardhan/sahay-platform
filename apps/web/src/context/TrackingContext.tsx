import React, { createContext, useContext, useState, useEffect } from 'react';

interface TrackingContextType {
    isTrackingEnabled: boolean;
    setIsTrackingEnabled: (value: boolean) => void;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Lazy initialize from localStorage so it survives refreshes
    const [isTrackingEnabled, setIsTrackingEnabled] = useState<boolean>(() => {
        try {
            const item = window.localStorage.getItem('sahay_tracking_enabled');
            return item ? JSON.parse(item) : true;
        } catch (error) {
            console.error("Error reading localStorage", error);
            return true;
        }
    });

    // Auto-save to localStorage whenever it changes
    useEffect(() => {
        try {
            window.localStorage.setItem('sahay_tracking_enabled', JSON.stringify(isTrackingEnabled));
        } catch (error) {
            console.error("Error setting localStorage", error);
        }
    }, [isTrackingEnabled]);

    return (
        <TrackingContext.Provider value={{ isTrackingEnabled, setIsTrackingEnabled }}>
            {children}
        </TrackingContext.Provider>
    );
};

export const useTracking = () => {
    const context = useContext(TrackingContext);
    if (context === undefined) {
        throw new Error('useTracking must be used within a TrackingProvider');
    }
    return context;
};
