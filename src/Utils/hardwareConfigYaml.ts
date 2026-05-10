import yaml from 'js-yaml';

export function parseHardwareConfigYaml(text: string): Record<string, unknown> {
    const loaded = yaml.load(text);
    if (loaded == null || typeof loaded !== 'object' || Array.isArray(loaded)) {
        throw new Error('Hardware YAML must parse to a mapping at the root.');
    }
    return loaded as Record<string, unknown>;
}

export function stringifyHardwareConfigYaml(doc: Record<string, unknown>): string {
    return yaml.dump(doc, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
    });
}
