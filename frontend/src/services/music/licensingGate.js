/**
 * DECKKNOB Music Licensing Gate
 * Fail-closed rights inspection engine for UGC music synchronization.
 * 
 * Strict Legal Principle:
 * Track discovery, stream availability, or an informal Creative Commons label
 * alone does NOT constitute authorization to synchronize music into public
 * user-generated stories, reels, or posts.
 */

// Permitted sync-safe Creative Commons variants (unambiguous, non-ND, non-NC)
const SYNC_SAFE_CC_PATTERNS = [
  /cc\s*by(\s*[-_]?\s*(?:4\.0|3\.0))?(\s*international)?$/i,
  /creative\s*commons\s*attribution(\s*(?:4\.0|3\.0))?(\s*international)?$/i,
  /cc\s*by-sa(\s*[-_]?\s*(?:4\.0|3\.0))?(\s*international)?$/i,
  /creative\s*commons\s*attribution-sharealike/i,
  /cc0/i,
  /public\s*domain/i
];

// Explicitly disqualified licenses (No Derivatives prohibits sync editing; Non-Commercial restricts promoter/DJ use)
const DISQUALIFIED_LICENSE_PATTERNS = [
  /all\s*rights\s*reserved/i,
  /-nd/i, // NoDerivatives
  /no\s*derivatives/i,
  /-nc/i, // NonCommercial
  /non-commercial/i,
  /noncommercial/i
];

export class LicensingValidationError extends Error {
  constructor(message, rightsEvidence) {
    super(message);
    this.name = 'LicensingValidationError';
    this.rightsEvidence = rightsEvidence;
  }
}

/**
 * Inspect raw track metadata from any provider and determine licensing status.
 * Fail-closed: Anything ambiguous, unverified, or restricted is REJECTED for publishing.
 */
export function evaluateTrackRights(rawTrack, provider = 'unknown') {
  const verifiedAt = new Date().toISOString();
  const rawLicense = String(rawTrack.license || rawTrack.licenseType || '').trim();
  const title = rawTrack.title || 'Untitled Track';
  const artist = rawTrack.artist || rawTrack.user?.name || rawTrack.user?.handle || 'Unknown Artist';

  // 1. Curated DECKKNOB catalog: verified sync-cleared electronic tracks
  if (provider === 'deckknob_curated') {
    return {
      canPreview: true,
      canPublish: true,
      syncCleared: true,
      rightsEvidence: {
        provider: 'deckknob_curated',
        licenseType: rawLicense || 'Creative Commons BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        licenseStatus: 'verified_sync_cleared',
        commercialUsePermitted: true,
        syncPermitted: true,
        territory: 'worldwide',
        attributionRequired: true,
        attributionText: rawTrack.attribution || `${artist} • Licensed under CC BY 4.0`,
        expiresAt: null, // perpetual
        verifiedAt,
        notes: rawTrack.isDemoFixture
          ? 'Explicit Demo Fixture: Pre-cleared royalty-free audio demo for DECKKNOB testing.'
          : 'Verified royalty-free catalog cleared for public UGC synchronization.'
      }
    };
  }

  // 1b. DJ Profile Demo: Stream listening permitted on profile; UGC synchronization prohibited without separate sync license
  if (provider === 'dj_demo' || rawTrack.isDemo || rawTrack.licenseType?.includes('Demo') || rawTrack.rightsEvidence?.licenseType?.includes('Demo')) {
    return {
      canPreview: true,
      canPublish: false,
      syncCleared: false,
      rightsEvidence: {
        provider: 'dj_demo',
        licenseType: rawTrack.licenseType || 'DJ Original Demo (Profile Stream Only)',
        licenseUrl: '',
        licenseStatus: 'profile_stream_only',
        commercialUsePermitted: false,
        syncPermitted: false,
        territory: 'profile_stream',
        attributionRequired: true,
        attributionText: rawTrack.attribution || `${title} by ${artist}`,
        expiresAt: null,
        verifiedAt,
        rejectionReason: 'DJ demo tracks are authorized for profile stream listening only and have not been cleared for public UGC video synchronization.'
      }
    };
  }

  // 2. Creator original upload with ownership affirmation
  if (provider === 'creator_upload') {
    return {
      canPreview: true,
      canPublish: true,
      syncCleared: true,
      rightsEvidence: {
        provider: 'creator_upload',
        licenseType: 'Original Creator Sound',
        licenseUrl: '',
        licenseStatus: 'creator_owned_affirmed',
        commercialUsePermitted: true,
        syncPermitted: true,
        territory: 'worldwide',
        attributionRequired: true,
        attributionText: `Original Sound by @${artist}`,
        expiresAt: null,
        verifiedAt,
        notes: 'Sound uploaded and affirmed by verified DECKKNOB creator.'
      }
    };
  }

  // 3. Commercial Stubs (Hoopr, Epidemic Sound)
  if (provider === 'hoopr' || provider === 'epidemic') {
    return {
      canPreview: false,
      canPublish: false,
      syncCleared: false,
      rightsEvidence: {
        provider,
        licenseType: 'Commercial Enterprise License',
        licenseUrl: provider === 'hoopr' ? 'https://hoopr.in' : 'https://www.epidemicsound.com',
        licenseStatus: 'commercial_credentials_required',
        commercialUsePermitted: false,
        syncPermitted: false,
        territory: 'unconfigured',
        attributionRequired: true,
        attributionText: '',
        expiresAt: null,
        verifiedAt,
        rejectionReason: `${provider.toUpperCase()} commercial integration is inactive. Valid API credentials and an enterprise sync licensing agreement are required.`
      }
    };
  }

  // 4. Audius Provider: Strict license analysis
  if (provider === 'audius') {
    // If no license text or empty string -> fail-closed
    if (!rawLicense) {
      return {
        canPreview: true, // Audio stream preview allowed for listening
        canPublish: false, // NOT cleared for public video/story synchronization
        syncCleared: false,
        rightsEvidence: {
          provider: 'audius',
          licenseType: 'Unspecified',
          licenseUrl: '',
          licenseStatus: 'rejected_insufficient_rights',
          commercialUsePermitted: false,
          syncPermitted: false,
          territory: 'unverified',
          attributionRequired: true,
          attributionText: `${artist} • via Audius`,
          expiresAt: null,
          verifiedAt,
          rejectionReason: 'Track license is unspecified. Audius stream access alone does not grant synchronization rights.'
        }
      };
    }

    // Check disqualified patterns (All Rights Reserved, No Derivatives, Non-Commercial)
    for (const pat of DISQUALIFIED_LICENSE_PATTERNS) {
      if (pat.test(rawLicense)) {
        return {
          canPreview: true,
          canPublish: false,
          syncCleared: false,
          rightsEvidence: {
            provider: 'audius',
            licenseType: rawLicense,
            licenseUrl: '',
            licenseStatus: 'rejected_insufficient_rights',
            commercialUsePermitted: false,
            syncPermitted: false,
            territory: 'restricted',
            attributionRequired: true,
            attributionText: `${artist} • via Audius`,
            expiresAt: null,
            verifiedAt,
            rejectionReason: `License "${rawLicense}" contains restrictions (e.g. All Rights Reserved, NoDerivatives, or NonCommercial) that prohibit UGC synchronization.`
          }
        };
      }
    }

    // Check sync-safe patterns (CC BY, CC BY-SA, Public Domain)
    const isSyncSafe = SYNC_SAFE_CC_PATTERNS.some((pat) => pat.test(rawLicense));
    if (isSyncSafe) {
      const isShareAlike = /sa/i.test(rawLicense);
      return {
        canPreview: true,
        canPublish: true,
        syncCleared: true,
        rightsEvidence: {
          provider: 'audius',
          licenseType: rawLicense,
          licenseUrl: isShareAlike
            ? 'https://creativecommons.org/licenses/by-sa/4.0/'
            : 'https://creativecommons.org/licenses/by/4.0/',
          licenseStatus: 'verified_sync_cleared',
          commercialUsePermitted: true,
          syncPermitted: true,
          territory: 'worldwide',
          attributionRequired: true,
          attributionText: `${title} by ${artist} (Audius) / ${rawLicense}`,
          expiresAt: null,
          verifiedAt,
          notes: 'Creative Commons Attribution sync-cleared from Audius metadata.'
        }
      };
    }

    // Fallback for unhandled licenses -> fail-closed
    return {
      canPreview: true,
      canPublish: false,
      syncCleared: false,
      rightsEvidence: {
        provider: 'audius',
        licenseType: rawLicense,
        licenseUrl: '',
        licenseStatus: 'unverified_license',
        commercialUsePermitted: false,
        syncPermitted: false,
        territory: 'unverified',
        attributionRequired: true,
        attributionText: `${artist} • via Audius`,
        expiresAt: null,
        verifiedAt,
        rejectionReason: `License "${rawLicense}" has unverified sync rights. Synchronization is prohibited under fail-closed policy.`
      }
    };
  }

  // Unknown provider -> strictly rejected
  return {
    canPreview: false,
    canPublish: false,
    syncCleared: false,
    rightsEvidence: {
      provider,
      licenseType: rawLicense || 'Unknown',
      licenseUrl: '',
      licenseStatus: 'rejected_insufficient_rights',
      commercialUsePermitted: false,
      syncPermitted: false,
      territory: 'unknown',
      attributionRequired: true,
      attributionText: '',
      expiresAt: null,
      verifiedAt,
      rejectionReason: `Provider "${provider}" is unrecognized and has no verified licensing verification adapter.`
    }
  };
}

/**
 * Asserts that a track is legally authorized for public synchronization.
 * Throws LicensingValidationError if rights are missing or insufficient.
 */
export function assertTrackSyncAuthorized(track) {
  if (!track) {
    throw new LicensingValidationError('No track specified for authorization check.', null);
  }
  if (!track.syncCleared || !track.canPublish) {
    const reason = track.rightsEvidence?.rejectionReason || 'Track is not authorized for synchronization.';
    throw new LicensingValidationError(
      `Sync Authorization Denied: ${reason}`,
      track.rightsEvidence || null
    );
  }
  return true;
}

/**
 * Validates whether a music payload meets all fail-closed criteria for publishing.
 * Returns { cleared: boolean, rejectionReason?: string }
 */
export function validatePublishing(music) {
  if (!music) return { cleared: true };
  if (music.canPublish === false || music.syncCleared === false) {
    return {
      cleared: false,
      rejectionReason: music.rightsEvidence?.rejectionReason || 'Track sync rights are not authorized.'
    };
  }
  if (music.provider === 'dj_demo' || music.isDemo || music.licenseType?.includes('Demo')) {
    return {
      cleared: false,
      rejectionReason: 'DJ demo tracks are authorized for profile stream listening only and have not been cleared for public UGC video synchronization.'
    };
  }
  if (music.rightsEvidence) {
    const status = music.rightsEvidence.licenseStatus;
    if (
      status === 'commercial_credentials_required' ||
      status === 'unverified_license' ||
      status === 'rejected_insufficient_rights' ||
      status === 'profile_stream_only'
    ) {
      return {
        cleared: false,
        rejectionReason: music.rightsEvidence.rejectionReason || 'License status does not permit synchronization.'
      };
    }
  }
  return { cleared: true };
}
