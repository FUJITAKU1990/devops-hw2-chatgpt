import { describe, expect, it } from 'vitest';

const baseUrl = new URL(
    process.env.TARTAN_BASE_URL ?? 'http://localhost:8636',
);

function applicationUrl(path: string): URL {
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    return url;
}

describe('Tartan Tickets smoke checks', () => {
    it('serves the browser application through the public ingress', async () => {
        const url = applicationUrl('/');
        const response = await fetch(url);

        expect(
            response.status,
            `GET ${url} returned ${response.status}`,
        ).toBe(200);
        expect(response.headers.get('content-type')).toMatch(/^text\/html\b/);
    });

    it('serves the public event catalog as JSON', async () => {
        const url = applicationUrl('/api/events');
        const response = await fetch(url);

        expect(
            response.status,
            `GET ${url} returned ${response.status}`,
        ).toBe(200);
        expect(response.headers.get('content-type')).toMatch(/^application\/json\b/);

        const events: unknown = await response.json();
        expect(Array.isArray(events)).toBe(true);
    });

    it('rejects the token-shaped authentication test fixture', async () => {
        const fixtureToken =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
            'eyJzdWIiOiJodzMtaGFybWxlc3MtZml4dHVyZSIsInJvbGUiOiJhZG1pbiJ9.' +
            'c3ludGhldGljLXRlc3Qtc2lnbmF0dXJl';
        const url = applicationUrl('/api/admin/events');
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${fixtureToken}` },
        });

        expect(response.status).toBe(401);
    });
});
