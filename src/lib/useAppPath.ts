/**
 * App-relative paths for Shell (`/apps/{slug}/…`) and Dev Shell.
 *
 * Never use root-absolute links like `to="/records"` — those leave the federated
 * app after deploy. Always build hrefs with these helpers.
 */

import { useParams } from 'react-router-dom';
import { APP_ID } from '../appIdentity';

/** `/apps/{slug}` for the current federated app (URL slug, not manifest.appId). */
export function useAppBasePath(): string {
    const { appSlug } = useParams<{ appSlug?: string }>();
    return `/apps/${appSlug || APP_ID}`;
}

/**
 * Path under the current app. Pass a segment (`"records"`) or nested path
 * (`"records/123"`). Leading slashes are stripped.
 */
export function useAppPath(segment = ''): string {
    const base = useAppBasePath();
    const path = segment.replace(/^\//, '');
    return path ? `${base}/${path}` : base;
}
