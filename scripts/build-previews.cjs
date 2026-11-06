'use strict';
// Optional, ignored fixtures/downloads. Run after the normal website build.
require('./build-login-pilot.cjs').buildLoginPilot();
require('./build-progress-pilot.cjs').buildProgressPilot();
require('./build-flashcards.cjs').buildFlashcardPreview();
require('./build-staff.cjs').buildStaffPreview();
require('./build-site-preview.cjs').buildSitePreviews();
require('./build-mechanism-preview.cjs').buildMechanismPreview();
require('./build-staff-demo.cjs').buildStaffDemo();
require('./build-forces-preview.cjs');
require('./build-electricity-preview.cjs');
