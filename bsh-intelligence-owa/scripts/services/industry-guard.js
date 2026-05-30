/**
 * BSH Intelligence OWA — Industry Guard
 *
 * Runs on every page load. Fetches the active tenant_config from the 420
 * brain (proxied through OpenMRS so the Bahmni session cookie is honored).
 * If industry !== 'healthcare_hospital', hides the app and shows a friendly
 * "not available" message.
 *
 * Multi-tenant safety: this OWA can be installed in any Bahmni instance but
 * will only function for hospital-industry tenants.
 */
angular.module('bshIntelligence').service('IndustryGuard', ['$http', '$window', function($http, $window) {
  var HOSPITAL = 'healthcare_hospital';
  var ZATE_API = $window.ZATE_API_BASE || 'https://ai.zatesystems.com/api';

  this.check = function() {
    return $http.get(ZATE_API + '/tenant-config?probe=industry', {withCredentials: true})
      .then(function(resp) {
        var industry = (resp.data && resp.data.industry) || 'unknown';
        if (industry !== HOSPITAL) {
          document.getElementById('industry-guard-error').style.display = 'block';
          document.getElementById('app-root').style.display = 'none';
          return {ok: false, industry: industry};
        }
        document.getElementById('app-root').style.display = 'block';
        return {ok: true, industry: industry};
      })
      .catch(function() {
        // On error, default to safe — hide the app
        document.getElementById('industry-guard-error').style.display = 'block';
        document.getElementById('app-root').style.display = 'none';
        return {ok: false, industry: 'unknown'};
      });
  };
}]);
