import { describe, expect, it } from 'vitest';

const baseUrl = new URL(
    process.env.TARTAN_BASE_URL ?? 'http://localhost:8080',
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
});
