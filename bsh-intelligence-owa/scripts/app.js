angular.module('bshIntelligence', [])
  .run(['IndustryGuard', function(IndustryGuard) {
    // Gate check fires immediately on module bootstrap.
    IndustryGuard.check();
  }]);
