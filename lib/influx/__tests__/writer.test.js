/**
 * @file writer.test.js
 * @description Tests for InfluxDB writer utilities
 */

const {
  normalizeTag,
  ENTERPRISE_ALIASES,
  SITE_ALIASES,
  parseTopicToInflux
} = require('../writer');
const { Point } = require('@influxdata/influxdb-client');

describe('normalizeTag', () => {
  test('exact alias match - AVEVA Enterprise A', () => {
    expect(normalizeTag('AVEVA Enterprise A', ENTERPRISE_ALIASES)).toBe('Enterprise A');
  });

  test('exact alias match - AVEVA Enterprise B', () => {
    expect(normalizeTag('AVEVA Enterprise B', ENTERPRISE_ALIASES)).toBe('Enterprise B');
  });

  test('exact alias match - AVEVA Enterprise C', () => {
    expect(normalizeTag('AVEVA Enterprise C', ENTERPRISE_ALIASES)).toBe('Enterprise C');
  });

  test('site alias - AVEVA - DALLAS', () => {
    expect(normalizeTag('AVEVA - DALLAS', SITE_ALIASES)).toBe('Dallas Line 1');
  });

  test('non-aliased value passes through', () => {
    expect(normalizeTag('Custom Enterprise', {})).toBe('Custom Enterprise');
  });

  test('null returns "unknown"', () => {
    expect(normalizeTag(null, {})).toBe('unknown');
  });

  test('undefined returns "unknown"', () => {
    expect(normalizeTag(undefined, {})).toBe('unknown');
  });

  test('non-string returns the value itself (123)', () => {
    // normalizeTag returns value || 'unknown', so non-string 123 returns 123
    expect(normalizeTag(123, {})).toBe(123);
  });

  test('empty string returns "unknown"', () => {
    // normalizeTag returns value || 'unknown', so empty string returns 'unknown'
    expect(normalizeTag('', {})).toBe('unknown');
  });
});

describe('parseTopicToInflux', () => {
  test('standard topic creates Point with correct tags and numeric payload', () => {
    const topic = 'Enterprise A/Dallas Line 1/packaging/machine1/quality/oee';
    const payload = '72.5';
    const point = parseTopicToInflux(topic, payload);

    // Point.toLineProtocol() needs a WritePrecision parameter
    // We'll use 'ns' (nanoseconds) which is what the writeApi uses
    const lineProtocol = point.toLineProtocol({ precision: 'ns' });

    // Line protocol format: measurement,tag1=value1,tag2=value2 field1=value1 timestamp
    expect(lineProtocol).toContain('quality_oee');
    expect(lineProtocol).toContain('enterprise=Enterprise\\ A');
    expect(lineProtocol).toContain('site=Dallas\\ Line\\ 1');
    expect(lineProtocol).toContain('area=packaging');
    expect(lineProtocol).toContain('machine=machine1');
    expect(lineProtocol).toContain('value=72.5');
  });

  test('numeric payload creates float field', () => {
    const topic = 'Enterprise A/Site1/area1/machine1/temp/sensor';
    const payload = '25.5';
    const point = parseTopicToInflux(topic, payload);

    const lineProtocol = point.toLineProtocol({ precision: 'ns' });
    expect(lineProtocol).toContain('value=25.5');
  });

  test('string payload creates string field', () => {
    const topic = 'Enterprise A/Site1/area1/machine1/status/state';
    const payload = 'running';
    const point = parseTopicToInflux(topic, payload);

    const lineProtocol = point.toLineProtocol({ precision: 'ns' });
    expect(lineProtocol).toContain('value="running"');
  });

  test('AVEVA enterprise alias normalization', () => {
    const topic = 'AVEVA Enterprise A/Site1/area1/machine1/temp/sensor';
    const payload = '25';
    const point = parseTopicToInflux(topic, payload);

    const lineProtocol = point.toLineProtocol({ precision: 'ns' });
    expect(lineProtocol).toContain('enterprise=Enterprise\\ A');
  });

  test('source option adds source tag', () => {
    const topic = 'Enterprise A/Site1/area1/machine1/temp/sensor';
    const payload = '25';
    const point = parseTopicToInflux(topic, payload, { source: 'demo-injected' });

    const lineProtocol = point.toLineProtocol({ precision: 'ns' });
    expect(lineProtocol).toContain('source=demo-injected');
  });

  test('short topic (fewer than 7 parts) handles gracefully', () => {
    const topic = 'Enterprise A/Site1';
    const payload = '42';
    const point = parseTopicToInflux(topic, payload);

    const lineProtocol = point.toLineProtocol({ precision: 'ns' });
    // Should still create a valid point with 'unknown' for missing parts
    expect(lineProtocol).toContain('enterprise=Enterprise\\ A');
    expect(lineProtocol).toContain('site=Site1');
    expect(lineProtocol).toContain('area=unknown');
    expect(lineProtocol).toContain('machine=unknown');
  });

  test('special characters in measurement name are replaced with underscore', () => {
    const topic = 'Enterprise A/Site1/area1/machine1/metric-name/value.raw';
    const payload = '10';
    const point = parseTopicToInflux(topic, payload);

    const lineProtocol = point.toLineProtocol({ precision: 'ns' });
    expect(lineProtocol).toContain('metric_name_value_raw');
  });

  test('full_topic tag is preserved', () => {
    const topic = 'Enterprise A/Dallas Line 1/packaging/machine1/quality/oee';
    const payload = '72.5';
    const point = parseTopicToInflux(topic, payload);

    const lineProtocol = point.toLineProtocol({ precision: 'ns' });
    // full_topic should be in the line protocol
    expect(lineProtocol).toContain('full_topic=');
  });

  test('long string payload is truncated to 200 chars', () => {
    const topic = 'Enterprise A/Site1/area1/machine1/log/message';
    const payload = 'x'.repeat(300);
    const point = parseTopicToInflux(topic, payload);

    const lineProtocol = point.toLineProtocol({ precision: 'ns' });
    // The value should be truncated
    const match = lineProtocol.match(/value="(x+)"/);
    expect(match).not.toBeNull();
    expect(match[1].length).toBe(200);
  });

  test('site alias normalization', () => {
    const topic = 'Enterprise A/AVEVA - DALLAS/area1/machine1/temp/sensor';
    const payload = '25';
    const point = parseTopicToInflux(topic, payload);

    const lineProtocol = point.toLineProtocol({ precision: 'ns' });
    expect(lineProtocol).toContain('site=Dallas\\ Line\\ 1');
  });
});

describe('ENTERPRISE_ALIASES constant', () => {
  test('contains AVEVA Enterprise A mapping', () => {
    expect(ENTERPRISE_ALIASES['AVEVA Enterprise A']).toBe('Enterprise A');
  });

  test('contains AVEVA Enterprise B mapping', () => {
    expect(ENTERPRISE_ALIASES['AVEVA Enterprise B']).toBe('Enterprise B');
  });

  test('contains AVEVA Enterprise C mapping', () => {
    expect(ENTERPRISE_ALIASES['AVEVA Enterprise C']).toBe('Enterprise C');
  });
});

describe('SITE_ALIASES constant', () => {
  test('contains AVEVA - DALLAS mapping', () => {
    expect(SITE_ALIASES['AVEVA - DALLAS']).toBe('Dallas Line 1');
  });
});
