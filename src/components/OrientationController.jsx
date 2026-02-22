import { useEffect } from 'react';

export default function OrientationController({ preferredOrientation = 'landscape' }) {
    useEffect(() => {
        const lockOrientation = async () => {
            try {
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock(preferredOrientation);
                }
            } catch (error) {
                console.log('Orientation lock not supported or failed:', error);
            }
        };

        lockOrientation();
    }, [preferredOrientation]);

    return null;
}