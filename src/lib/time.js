import { getTimeZones } from '@vvo/tzdb';
import * as chrono from 'chrono-node';
import { TIMEZONE_ALIASES } from '../data/timezoneAliases.js';

const timeZones = getTimeZones({ includeUtc: true });
const aliasEntries = Object.entries(TIMEZONE_ALIASES).sort((a, b) => b[0].length - a[0].length);

const normalize = (value = '') =>
    value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[_/,-]+/g, ' ')
        .replace(/\s+/g, ' ');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getUserTimeZone = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const getTimeZoneList = () => timeZones;

export function resolveTimeZone(input) {
    const query = normalize(input);
    if (!query) return null;

    const aliasZone = TIMEZONE_ALIASES[query];
    if (aliasZone) return hydrateZone(aliasZone, query, 'alias');

    const exactName = timeZones.find((zone) => normalize(zone.name) === query);
    if (exactName) return buildZoneResult(exactName, input, 'iana');

    const exactCountry = timeZones.filter((zone) => normalize(zone.countryName) === query);
    if (exactCountry.length === 1) return buildZoneResult(exactCountry[0], input, 'country');
    if (exactCountry.length > 1) return buildZoneResult(exactCountry[0], input, 'country-primary', exactCountry.slice(0, 6));

    const exactCity = timeZones.find((zone) =>
        zone.mainCities?.some((city) => normalize(city) === query)
    );
    if (exactCity) return buildZoneResult(exactCity, input, 'city');

    const exactAlternative = timeZones.find((zone) => normalize(zone.alternativeName) === query);
    if (exactAlternative) return buildZoneResult(exactAlternative, input, 'alternative-name');

    const containsMatch = timeZones.find((zone) => {
        const searchable = normalize([
            zone.name,
            zone.countryName,
            zone.alternativeName,
            ...(zone.mainCities || [])
        ].join(' '));
        return searchable.includes(query) || query.includes(normalize(zone.countryName));
    });

    if (containsMatch) return buildZoneResult(containsMatch, input, 'fuzzy');

    return null;
}

function hydrateZone(zoneName, label = zoneName, matchType = 'alias') {
    const found = timeZones.find(
        (zone) => zone.name === zoneName || zone.group?.includes(zoneName)
    );

    if (found) return buildZoneResult(found, label, matchType);

    if (zoneName === 'UTC') {
        return {
            name: 'UTC',
            label: 'UTC',
            countryName: 'Universal Time',
            alternativeName: 'Coordinated Universal Time',
            mainCities: ['UTC'],
            currentTimeFormat: '+00:00 Coordinated Universal Time',
            matchType
        };
    }

    return null;
}

function buildZoneResult(zone, originalInput, matchType, alternatives = []) {
    return {
        name: zone.name,
        label: prettifyZoneLabel(zone),
        countryName: zone.countryName,
        countryCode: zone.countryCode,
        alternativeName: zone.alternativeName,
        mainCities: zone.mainCities || [],
        currentTimeFormat: zone.currentTimeFormat,
        rawFormat: zone.rawFormat,
        abbreviation: zone.abbreviation,
        matchType,
        originalInput,
        alternatives: alternatives.map((item) => ({
            name: item.name,
            label: prettifyZoneLabel(item),
            countryName: item.countryName,
            mainCities: item.mainCities || []
        }))
    };
}

export function prettifyZoneLabel(zone) {
    if (!zone) return 'Unknown time zone';
    if (zone.name === 'UTC') return 'UTC';

    const cities = zone.mainCities?.slice(0, 2).join(', ');
    if (cities && zone.countryName) return `${cities}, ${zone.countryName}`;
    return zone.name.replace(/_/g, ' ');
}

export function formatInTimeZone(date, timeZone, options = {}) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone,
        ...options
    }).format(date);
}

export function getClockParts(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hourCycle: 'h23',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).formatToParts(date);

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const hour = Number(values.hour === '24' ? 0 : values.hour);
    const minute = Number(values.minute);
    const second = Number(values.second);

    return { hour, minute, second };
}

export function getDateDisplay(date, timeZone) {
    return formatInTimeZone(date, timeZone, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

export function getDigitalDisplay(date, timeZone) {
    return formatInTimeZone(date, timeZone, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

export function getShortZoneDisplay(date, timeZone) {
    const part = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'short'
    })
        .formatToParts(date)
        .find((item) => item.type === 'timeZoneName');

    return part?.value || timeZone;
}

export function findTimeZoneInsideText(text) {
    const normalizedText = ` ${normalize(text)} `;

    const offsetMatch = text.match(/\b(?:utc|gmt)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?\b/i);
    if (offsetMatch) {
        const sign = offsetMatch[1] === '-' ? -1 : 1;
        const hours = Number(offsetMatch[2]);
        const minutes = Number(offsetMatch[3] || 0);
        const offsetMinutes = sign * (hours * 60 + minutes);
        return {
            type: 'fixed-offset',
            offsetMinutes,
            name: formatOffsetName(offsetMinutes),
            label: formatOffsetName(offsetMinutes),
            matchedText: offsetMatch[0]
        };
    }

    for (const [alias, zoneName] of aliasEntries) {
        const normalizedAlias = normalize(alias);
        const pattern = new RegExp(`(^|\\s)${escapeRegex(normalizedAlias)}(?=\\s|$)`, 'i');
        if (pattern.test(normalizedText)) {
            const hydrated = hydrateZone(zoneName, alias, 'prompt-alias');
            if (hydrated) {
                return {
                    type: 'iana-zone',
                    ...hydrated,
                    matchedText: alias
                };
            }
        }
    }

    const byIanaName = timeZones.find((zone) =>
        normalizedText.includes(` ${normalize(zone.name)} `)
    );
    if (byIanaName) {
        return { type: 'iana-zone', ...buildZoneResult(byIanaName, byIanaName.name, 'prompt-iana'), matchedText: byIanaName.name };
    }

    const byCityOrCountry = timeZones.find((zone) => {
        const names = [zone.countryName, zone.alternativeName, ...(zone.mainCities || [])]
            .filter(Boolean)
            .map(normalize)
            .sort((a, b) => b.length - a.length);
        return names.some((name) => name.length >= 3 && normalizedText.includes(` ${name} `));
    });

    if (byCityOrCountry) {
        return {
            type: 'iana-zone',
            ...buildZoneResult(byCityOrCountry, byCityOrCountry.name, 'prompt-location'),
            matchedText: byCityOrCountry.name
        };
    }

    return null;
}

export async function convertPromptToUserTime(prompt) {
    const sourceZone = findTimeZoneInsideText(prompt);
    const localZoneName = getUserTimeZone();
    const userZone = hydrateZone(localZoneName, localZoneName, 'user-local') || {
        name: localZoneName,
        label: localZoneName.replace(/_/g, ' ')
    };

    const cleanPrompt = sourceZone?.matchedText
        ? prompt.replace(new RegExp(escapeRegex(sourceZone.matchedText), 'i'), ' ')
        : prompt;

    const parsed = chrono.parse(cleanPrompt, new Date(), { forwardDate: true });
    if (!parsed.length) {
        throw new Error('I could not find a date/time in that prompt. Try: “Monday June 8 7:00 PM Eastern”.');
    }

    const start = parsed[0].start;
    const fallbackDate = parsed[0].date();
    const parts = {
        year: start.get('year') ?? fallbackDate.getFullYear(),
        month: start.get('month') ?? fallbackDate.getMonth() + 1,
        day: start.get('day') ?? fallbackDate.getDate(),
        hour: start.get('hour') ?? 0,
        minute: start.get('minute') ?? 0,
        second: start.get('second') ?? 0
    };

    const chronoOffset = start.get('timezoneOffset');

    let instant;
    let sourceLabel;
    let sourceName;

    if (sourceZone?.type === 'fixed-offset') {
        instant = localPartsWithOffsetToDate(parts, sourceZone.offsetMinutes);
        sourceLabel = sourceZone.label;
        sourceName = sourceZone.name;
    } else if (sourceZone?.type === 'iana-zone') {
        instant = zonedLocalPartsToDate(parts, sourceZone.name);
        sourceLabel = sourceZone.label;
        sourceName = sourceZone.name;
    } else if (typeof chronoOffset === 'number') {
        instant = localPartsWithOffsetToDate(parts, chronoOffset);
        sourceLabel = formatOffsetName(chronoOffset);
        sourceName = sourceLabel;
    } else {
        throw new Error('I found the time, but not the source time zone. Add a zone like Eastern, UTC+6, Tokyo, or America/New_York.');
    }

    await delay(650);

    return {
        prompt,
        instant,
        source: {
            zoneName: sourceName,
            label: sourceLabel,
            formatted: formatConversionDisplay(instant, sourceZone?.type === 'fixed-offset' ? null : sourceName, sourceZone?.offsetMinutes)
        },
        target: {
            zoneName: userZone.name,
            label: userZone.label,
            formatted: formatConversionDisplay(instant, userZone.name)
        }
    };
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function localPartsWithOffsetToDate(parts, offsetMinutes) {
    const utc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    );
    return new Date(utc - offsetMinutes * 60 * 1000);
}

function zonedLocalPartsToDate(parts, timeZone) {
    const utcGuess = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    );

    const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
    const firstInstant = new Date(utcGuess - firstOffset);
    const secondOffset = getTimeZoneOffsetMs(firstInstant, timeZone);

    if (firstOffset !== secondOffset) {
        return new Date(utcGuess - secondOffset);
    }

    return firstInstant;
}

function getTimeZoneOffsetMs(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).formatToParts(date);

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const asUtc = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour === '24' ? 0 : values.hour),
        Number(values.minute),
        Number(values.second)
    );

    return asUtc - date.getTime();
}

function formatConversionDisplay(date, timeZone, fixedOffsetMinutes) {
    if (typeof fixedOffsetMinutes === 'number') {
        const shifted = new Date(date.getTime() + fixedOffsetMinutes * 60 * 1000);
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC',
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(shifted) + ` ${formatOffsetName(fixedOffsetMinutes)}`;
    }

    return new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        hour12: true
    }).format(date);
}

function formatOffsetName(offsetMinutes) {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absolute = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
    const minutes = String(absolute % 60).padStart(2, '0');
    return `UTC${sign}${hours}:${minutes}`;
}
