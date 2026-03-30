// Rate limiting utility functions for login attempts per email

export function getAttemptsLS(email: string): number[] {
	if (!email) return [];
	try {
		const raw = localStorage.getItem(`login_attempts_${email}`);
		if (!raw) return [];
		return JSON.parse(raw) as number[];
	} catch {
		return [];
	}
}

export function setAttemptsLS(email: string, arr: number[]) {
	if (!email) return;
	localStorage.setItem(`login_attempts_${email}`, JSON.stringify(arr));
}

export function clearAttemptsLS(email: string) {
	if (!email) return;
	localStorage.removeItem(`login_attempts_${email}`);
}
