import { describe, it, expect } from 'vitest';
import { buildBackupObject, validateBackupObject, summarizeBackup } from '../src/features/backup.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/migrations.js';

function sampleState() {
    return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        studentName: 'Pranathi',
        subjectsYear1: [
            { id: 'y1_maths', name: 'Maths', grades: { sem1: [{ id: 'g1', value: 5.0 }], sem2: [{ id: 'g2', value: 4.5 }] } },
            { id: 'y1_fr', name: 'Français', grades: { sem1: [], sem2: [] } }
        ],
        subjectsYear2: [],
        subjectsYear3: []
    };
}

describe('buildBackupObject', () => {
    it('wraps state with the gradevibe markers and version', () => {
        const backup = buildBackupObject(sampleState(), []);
        expect(backup.app).toBe('gradevibe');
        expect(backup.kind).toBe('backup');
        expect(backup.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(backup.state.studentName).toBe('Pranathi');
        expect(backup.photos).toBeUndefined(); // no empty photos array
    });

    it('includes photos when provided', () => {
        const backup = buildBackupObject(sampleState(), [{ gradeId: 'g1', data: 'data:image/jpeg;base64,xx' }]);
        expect(backup.photos).toHaveLength(1);
    });

    it('round-trips through JSON without loss', () => {
        const backup = buildBackupObject(sampleState(), []);
        const revived = JSON.parse(JSON.stringify(backup));
        expect(revived.state).toEqual(sampleState());
        expect(validateBackupObject(revived).ok).toBe(true);
    });
});

describe('validateBackupObject', () => {
    it('accepts a valid backup', () => {
        expect(validateBackupObject(buildBackupObject(sampleState(), [])).ok).toBe(true);
    });

    it('rejects foreign or malformed files', () => {
        expect(validateBackupObject(null).ok).toBe(false);
        expect(validateBackupObject({ app: 'other', kind: 'backup', state: {} }).ok).toBe(false);
        expect(validateBackupObject({ app: 'gradevibe', kind: 'export', state: {} }).ok).toBe(false);
        expect(validateBackupObject({ app: 'gradevibe', kind: 'backup' }).ok).toBe(false);
        expect(validateBackupObject({ app: 'gradevibe', kind: 'backup', state: [] }).ok).toBe(false);
        expect(validateBackupObject({ app: 'gradevibe', kind: 'backup', state: {}, photos: 'nope' }).ok).toBe(false);
    });

    it('rejects backups from a newer app version', () => {
        const backup = buildBackupObject({ ...sampleState(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }, []);
        const verdict = validateBackupObject(backup);
        expect(verdict.ok).toBe(false);
        expect(verdict.reason).toBe('newer-version');
    });
});

describe('summarizeBackup', () => {
    it('counts subjects, grades and photos across every list', () => {
        const backup = buildBackupObject(sampleState(), [{ gradeId: 'g1', data: 'x' }]);
        const summary = summarizeBackup(backup);
        expect(summary.subjects).toBe(2);
        expect(summary.grades).toBe(2);
        expect(summary.photos).toBe(1);
    });

    it('handles legacy array-form grades', () => {
        const s = sampleState();
        s.subjectsYear1[0].grades = [{ id: 'g1', value: 5.0 }];
        const summary = summarizeBackup(buildBackupObject(s, []));
        expect(summary.grades).toBe(1);
    });
});
