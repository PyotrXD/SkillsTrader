import { useState, useRef, useEffect } from 'react';
import { getAttemptsLS, setAttemptsLS, clearAttemptsLS } from '../utils/rateLimit';

export interface UseRateLimitOptions {
	maxAttempts?: number;
	windowMs?: number;
}

export function useRateLimit(email: string, options?: UseRateLimitOptions) {
	const MAX_ATTEMPTS = options?.maxAttempts ?? 5;
	const WINDOW_MS = options?.windowMs ?? 5 * 60 * 1000;

	const [attempts, setAttempts] = useState<number[]>([]);
	const [locked, setLocked] = useState(false);
	const lockTimeout = useRef<number | null>(null);

	// Check attempts and lock status on email change
	useEffect(() => {
        if (!email) {
            setLocked(false);
            setAttempts([]);
            return;
        }
        const now = Date.now();
        const prevAttempts = getAttemptsLS(email).filter(ts => now - ts < WINDOW_MS);
        setAttempts(prevAttempts);
        if (prevAttempts.length >= MAX_ATTEMPTS) {
            setLocked(true);
            if (!lockTimeout.current) {
            lockTimeout.current = window.setTimeout(() => {
                setLocked(false);
                setAttempts([]);
                clearAttemptsLS(email);
                lockTimeout.current = null;
            }, WINDOW_MS - (now - prevAttempts[0]));
            }
        } else {
            setLocked(false);
            if (lockTimeout.current) {
            clearTimeout(lockTimeout.current);
            lockTimeout.current = null;
            }
        }
		// eslint-disable-next-line
	}, [email, attempts]);

	// Call this on failed login
	function addAttempt() {
		const now = Date.now();
		setAttempts(prev => {
			const filtered = prev.filter(ts => now - ts < WINDOW_MS);
			const updated = [...filtered, now];
			setAttemptsLS(email, updated);
			return updated;
		});
	}

	// Call this on successful login
	function resetAttempts() {
		setAttempts([]);
		clearAttemptsLS(email);
	}

	return {
		attempts,
		locked,
		addAttempt,
		resetAttempts,
		maxAttempts: MAX_ATTEMPTS,
		windowMs: WINDOW_MS,
	};
}
