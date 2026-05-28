angular.module('bshIntelligence').controller('DashboardController', [
  '$scope', 'ZateAPI', 'IndustryGuard',
  function($scope, ZateAPI, IndustryGuard) {
    var vm = this;
    vm.tenantId = window.BAHMNI_TENANT_ID || 'bsh-demo';
    vm.userId = window.OPENMRS_USER_UUID || 'unknown';
    vm.criticalAlerts = [];
    vm.bedStatus = {};
    vm.omegaResponse = '';
    vm.loading = false;

    vm.refresh = function() {
      vm.loading = true;
      ZateAPI.getCriticalAlerts(vm.tenantId).then(function(r) {
        vm.criticalAlerts = (r.data && r.data.result && r.data.result.criticals) || [];
      });
      ZateAPI.getBedStatus(vm.tenantId).then(function(r) {
        vm.bedStatus = r.data || {};
        vm.loading = false;
      });
    };

    vm.askOmega = function(question) {
      vm.loading = true;
      ZateAPI.askOmega(vm.tenantId, question, vm.userId).then(function(r) {
        vm.omegaResponse = r.data.response || '';
        vm.loading = false;
      });
    };

    // Run only if industry gate passes
    IndustryGuard.check().then(function(g) {
      if (g.ok) vm.refresh();
    });
  }
]);
