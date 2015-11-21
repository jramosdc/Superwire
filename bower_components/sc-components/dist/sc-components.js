/**
 * sc-components
 * Simple reusable angular UI components
 * @version 0.1.38
 * Copyright(c) SafetyChanger
 * @license MIT
 */

'use strict';

angular.module('sc-components', [
  'sc-confirm',
  'sc-dropdown',
  'sc-enter',
  'sc-list',
  'sc-listing'
]);

'use strict';

/**
 * sc-confirm
 *
 * Similar to window.confirm but with modal window
 *
 * Dependencies
 *
 *    ui.bootstrap
 *
 * Make sure you include the source files of ui.bootstrap.modal
 *
 * Usage
 *
 *  <a sc-confirm="remove()"
 *    sc-confirm-message="Are you sure custom message?"
 *    sc-on-cancel="cancel()"
 *    template-url="'/templates/confirm.html'"
 *    btn-placement="'left'"
 *    item="resource">
 *  </a>
 */

angular.module('sc-confirm', [
  'ui.bootstrap'
])

/**
 * Constants
 */

.constant('scConfirmDefaults', {
  message: 'Are you sure?',
  btnPlacement: 'right'
})

.directive('scConfirm', [
  '$modal', '$compile', '$parse', '$http', '$q', '$templateCache', 'scConfirmDefaults',
  function ($modal, $compile, $parse, $http, $q, $templateCache, defaults) {
    return {
      restrict: 'A',
      link: function($scope, element, attrs) {
        var scope = $scope.$new();
        var isDefined = angular.isDefined;
        var deferred = $q.defer();
        var promise = deferred.promise;
        var validPlacements = ['left', 'center', 'right'];
        var btnPlacement;
        var template;
        var templateUrl;

        $scope.$on('$destroy', function () {
          scope.$destroy();
        });

        // Parse attrs

        // template and template-url
        if (isDefined(attrs.template)) {
          template = scope.$parent.$eval(attrs.template);
          deferred.resolve(template);
        } else if (isDefined(attrs.templateUrl)) {
          templateUrl = scope.$parent.$eval(attrs.templateUrl);
          $http.get(templateUrl, { cache: $templateCache })
            .success(function (html) {
              deferred.resolve(html);
            })
            .error(deferred.reject);
        } else {
          deferred.resolve('');
        }

        // btn-placement
        if (isDefined(attrs.btnPlacement)) {
          btnPlacement = scope.$parent.$eval(attrs.btnPlacement);
        }

        // sc-confirm-message
        scope.message = attrs.scConfirmMessage || defaults.message;
        attrs.$observe('scConfirmMessage', function (msg) {
          scope.message = msg || defaults.message;
        });

        // console.log($parse(attrs.scConfirm));
        // sc-confirm
        function onConfirm () {
          $parse(attrs.scConfirm)($scope);
        }

        // sc-on-cancel
        function onCancel () {
          $parse(attrs.scOnCancel)($scope);
        }

        if (!~validPlacements.indexOf(btnPlacement)) {
          btnPlacement = defaults.btnPlacement;
        }

        promise.then(function (tpl) {

          var template = [
            '<div class="modal-header">',
            '  <button type="button" class="close" ng-click="cancel()" aria-hidden="true">&times;</button>',
            '  <h4 class="modal-title">{{ message }}</h4>',
            '</div>',
            '<div class="modal-body">',
            '  '+ tpl +'&nbsp;',
            '</div>',
            '<div class="modal-footer sc-'+ btnPlacement +'">',
            '  <button class="btn btn-primary" ng-click="ok()">Yes</button>',
            '  <button class="btn btn-link" ng-click="cancel()">Cancel</button>',
            '</div>'
          ].join('\n');

          element.bind('click', function () {
            var modalInstance = $modal.open({
              template: template,
              controller: 'ModalInstanceCtrl',
              scope: scope,
              resolve: {
                onCancel: function () { return onCancel; }
              }
            });

            modalInstance.result.then(onConfirm);
          });
        });
      }
    };
  }
])

/**
 * scConfirm Modal Controller
 */

.controller('ModalInstanceCtrl', [
  '$scope', '$modalInstance', 'onCancel',
  function ($scope, $modalInstance, onCancel) {
    $scope.ok = $modalInstance.close;
    $scope.cancel = function () {
      if (onCancel) onCancel();
      $modalInstance.dismiss('cancel');
    };
  }
]);

// TODO: give a provider

'use strict';

/**
 * sc-dropdown
 *
 * dropdowns
 *
 * Dependencies
 *
 *    sc-listing
 *    ui.bootstrap.dropdown
 *
 * Usage:
 *
 *    <sc-dropdown
 *      items="items"
 *      attribute="'name'"
 *      default="expression"
 *      label="'Choose assignee'"
 *      type="'simple'" // or 'single' or 'split'
 *      on-select="doSomething">
 *    </sc-dropdown>
 *
 * There are 3 types of dropdowns available.
 *   - simple: a simple anchor link (default)
 *   - single: a button with dropdown
 *   - split: a button with split caret as dropdown
 */

angular.module('sc-dropdown', [
  'sc-listing',
  'ui.bootstrap.dropdown'
])

/**
 * Constants
 */

.constant('scDropdownDefaults', {
  btnClass: 'btn btn-',
  btnDefault: 'link',
  type: 'simple',
  label: 'Choose from the list'
})

.service('scDropdownApi', ['$http', function ($http) {
  return {
    get: function (term, url) {
      return $http({ method: 'GET', url: url + '&filter=' + term });
    }
  };
}])

.directive('scDropdown', [
  '$compile', 'scDropdownDefaults', 'scDropdownApi', '$timeout',
  function ($compile, defaults, Api, $timeout) {
  return {
    restrict: 'E',
    link: function ($scope, element, attrs) {
      var isDefined = angular.isDefined;
      var isFunction = angular.isFunction;
      var validTypes = ['simple', 'single', 'split'];
      var validFlavors = ['single', 'multiple'];

      // Isolated scope. Don't pollute parent scope
      var scope = $scope.$new();

      $scope.$on('$destroy', function () {
        scope.$destroy();
      });

      // to store 3 types of dropdowns
      // - simple
      // - single
      // - split
      var dropdown = {};

      // template string containing the label
      var labelTpl;

      // 2 flavors of dropdown
      // - single select
      // - multiple select
      var flavor;

      // to call the on-select method as soon as an item from the dd is selected
      var autoSelect = true;

      // template for listing dropdown items
      var template = '';

      // for flavored dropdowns, include header
      var startTag = '';
      var closeTag = '';

      // for flavored dropdowns, include footer
      var footer = '';

      // active="method" attr when item in the dropdown listing is active
      var active = '';

      // Search
      // - static
      // - dynamic
      var search;
      var searchUrl;
      var searchTpl = '';

      var dropdownClass = 'dropdown-menu';

      // defaults
      var btnClass = defaults.btnClass;
      var btnDefault = defaults.btnDefault;
      var type = defaults.type;
      var label = defaults.label;

      // to store original items
      var original = $scope.$eval(attrs.items);

      // Will contain `item` (single select) and `items` (multiple select)
      scope.selected = {};

      // Parse
      scope.items = $scope.$eval(attrs.items);
      $scope.$watch(attrs['items'], function (items) {
        scope.items = items;
      });

      // scope.ngModel = $scope.$eval(attrs.ngModel);
      $scope.$watch(attrs['ngModel'], function (ngModel) {
        scope.ngModel = ngModel;
      });
      scope.activeSelection = function () {
        return $scope.$eval(attrs.activeSelection);
      };
      scope.onToggle = function () {
        return $scope.$eval(attrs.onToggle);
      };
      scope.isOpen = $scope.$eval(attrs.isOpen);

      // attribute
      // when items is an array of obj, the attribute within the object
      // that is used to display the list item
      var attribute = $scope.$eval(attrs.attribute);

      // keep-label
      // Always show label
      var keepLabel = isDefined(attrs.keepLabel);

      // auto-select (calls the onSelect method as soon as you click)
      if (isDefined(attrs.autoSelect)) {
        autoSelect = $scope.$eval(attrs.autoSelect);
      }

      // type
      if (isDefined(attrs.type)) {
        type = $scope.$eval(attrs.type);
        type = !~validTypes.indexOf(type)
          ? 'simple'
          : type;
      }

      // search
      if (isDefined(attrs.search) && attrs.search in { dynamic: 1, static: 1 }) {
        search = attrs.search;
      }

      if (search === 'dynamic' && isDefined(attrs.searchUrl)) {
        searchUrl = $scope.$eval(attrs.searchUrl);
      }

      // label
      if (isDefined(attrs.label)) {
        // scope.label = $scope.$eval(attrs.label);
        attrs.$observe('label', function (val) {
          scope.label = val;
        });
      }

      // flavor
      if (isDefined(attrs.flavor)) {
        flavor = $scope.$eval(attrs.flavor);
        if (!~validFlavors.indexOf(flavor)) flavor = undefined;
      }

      // default
      if (isDefined(attrs.default)) {
        label = $scope.$eval(attrs.default);
        if (flavor === 'multiple') {
          scope.selected.items = isFunction(label)
            ? label()
            : label;
        } else {
          scope.selected.item = isFunction(label)
            ? label()
            : label;
        }
        label = scope.selected.item;
      }
      scope.label = scope.label || label;

      // btn-class
      if (isDefined(attrs.btnClass)) {
        btnDefault = $scope.$eval(attrs.btnClass);
      }
      btnClass = btnClass + btnDefault;

      // on-select
      var onSelect = $scope.$eval(attrs.onSelect);

      // Check if the items is an array of objects or strings
      // and depending on that, build the template
      if (typeof scope.items[0] !== 'string') {
        labelTpl = '{{ selected.item[\''+ attribute +'\'] || label }}';
        scope.template = '<a href>{{ item[\''+ attribute +'\'] }}</a>';
      } else {
        labelTpl = '{{ selected.item || label }}';
        scope.template = '<a href>{{ item }}</a>';
      }

      // if keep-label was passed as an attr, make sure the label is
      // shown always
      if (keepLabel) labelTpl = '{{ label }}';

      // for multiple select, remember the selected ones in `selected.items`
      if (flavor === 'multiple' && !scope.selected.items) {
        scope.selected.items = [];
      }

      scope.select = function (item) {
        // single select
        if (flavor !== 'multiple') {
          if (angular.equals(scope.selected.item, item)) {
            scope.selected.item = undefined;
          } else {
            scope.selected.item = item;
          }
          if (autoSelect) {
            onSelect(scope.selected.item);
            if (flavor) scope.close();
          }
          return;
        }

        // for multiple select
        var index = -1;
        scope.selected.items.forEach(function (_item, idx) {
          if (angular.equals(_item, item)) index = idx;
        });
        if (!~index) scope.selected.items.push(item);
        else scope.selected.items.splice(index, 1);
        if (autoSelect) onSelect(scope.selected.items);
      };

      /**
       * Search
       */

      if (search) {
        var delay;
        scope.$watch('searchTerm', function (term) {
          if (!term) return resetItems();
          if (term.length <= 2) return resetItems();

          // Static search (search within the given list)
          if (search === 'static') {
            scope.items = scope.items.filter(function (item) {
              var str = (typeof item === 'string')
                ? item
                : item[attribute];
              console.log(str.match(term), str, term);
              var regex = new RegExp(term, 'ig');
              return str.match(regex);
            });
            return;
          }

          // Dynamic search (search through api)
          $timeout.cancel(delay);
          delay = $timeout(function () {
            scope.searching = Api.get(term, searchUrl)
              .then(function (res) {
                scope.items = res.data;
                delete scope.searching;
              })
              .catch(function () {
                delete scope.searching;
              });
          }, 300);
        });

        searchTpl = [
          '<div class="sc-dropdown-search">',
          '  <input type="text" ng-model="searchTerm" class="form-control" placeholder="Enter assignee name">',
          '</div>'
        ].join('');
      }

      function resetItems () {
        scope.items = original;
      }

      if (flavor) {
        startTag = [
          '<div class="sc-dropdown '+ dropdownClass +'" ng-click="$event.stopPropagation()">',
          '  <div class="sc-dropdown-header">',
          '    <span ng-if="searching" class="loading"><i class="fa fa-spinner fa-spin"></i></span>',
          '    <strong>{{ label }}</strong>',
          '    <a href ng-click="close()" class="pull-right">',
          '      <span aria-hidden="true">&times;</span>',
          '    </a>',
          '  </div>',
          '  ' + searchTpl
        ].join('');

        scope.onSelect = onSelect;

        if (isDefined(attrs.footer)) {
          footer = [
            '  <div class="sc-dropdown-footer">',
            '    <button class="btn btn-primary btn-xs btn-block" ng-click="onSelect(',
            flavor === 'multiple' ? 'selected.items' : 'selected.item',
            ')">',
            '      Apply',
            '    </button>',
            '  </div>',
          ].join('');
        }

        closeTag = [
          footer,
          '</div>'
        ].join('');

        // Add active class
        scope.active = function (_item) {
          return comparator(_item);
        };

        // Close single and multiple select dropdowns
        scope.close = function () {
          scope.isOpen = false;
          if (isDefined(attrs.isOpen)) $scope.isOpen = false;
        };

        active = 'active="active"';
        dropdownClass = '';
      }

      /**
       * Compare items/item
       * @param {Object|String} _item (selected item)
       * @return {Boolean}
       */

      function comparator (_item) {
        if (flavor !== 'multiple') {
          return angular.equals(_item, scope.selected.item);
        }
        // multiple
        return scope.selected.items.filter(function (item) {
          return angular.equals(_item, item);
        }).length;
      }

      if (isDefined(attrs.templateUrl)) {
        template = 'template-url="'+ attrs.templateUrl +'">';
      } else if (isDefined(attrs.template)) {
        scope.tpl = $scope.$eval(attrs.template);
        template = 'template="tpl">';
      } else {
        template = 'template="template">';
      }

      // use scope.activeSelection() only if it was provided
      var selectedClass;
      if (isDefined(attrs.activeSelection)) {
        selectedClass = 'ng-class="{ \'sc-dropdown-selected\': activeSelection() }"';
      } else {
        selectedClass = 'ng-class="{ \'sc-dropdown-selected\': (selected.item || selected.items.length) }"';
      }

      var listing = [
        startTag,
        '  <sc-listing class="'+ dropdownClass +'"',
        '    ' + active,
        '    items="items"',
        '    on-item-click="select"',
        '    ng-model="ngModel"',
        '    ' + template,
        '  </sc-listing>',
        closeTag
      ].join('');

      dropdown.simple = [
        '<span class="dropdown" dropdown is-open="isOpen" on-toggle="onToggle()(open)">',
        '  <a href class="dropdown-toggle" dropdown-toggle '+ selectedClass +'>',
        '    ' + labelTpl,
        '  </a>',
        '  ' + listing,
        '</span>'
      ].join('');

      dropdown.single = [
        '<div class="btn-group" dropdown is-open="isOpen" on-toggle="onToggle()(open)">',
        '  <button type="button" class="'+ btnClass +' dropdown-toggle" dropdown-toggle '+ selectedClass +'>',
        '    ' + labelTpl + ' <span class="caret"></span>',
        '  </button>',
        '  ' + listing,
        '</div>'
      ].join('');

      dropdown.split = [
        '<div class="btn-group" dropdown is-open="isOpen" on-toggle="onToggle()(open)">',
        '  <button type="button" class="'+ btnClass +'" dropdown-toggle '+ selectedClass +'>'+ labelTpl +'</button>',
        '  <button type="button" class="'+ btnClass +' dropdown-toggle">',
        '    <span class="caret"></span>',
        '  </button>',
        '  ' + listing,
        '</div>'
      ].join('');

      var html = isDefined(attrs.onlyListing)
        ? listing
        : dropdown[type];

      element.replaceWith($compile(html)(scope));
    }
  };
}]);

'use strict';

/*!
 * sc-enter
 * Copyright(c) 2014 Madhusudhan Srinivasa <madhu@changer.nl>
 * MIT Licensed
 */

/**
 * sc-enter
 *
 * Usage:
 *
 *  <input sc-enter="search()" type="text" ng-model="term">
 */

angular.module('sc-enter', [])

.directive('scEnter', function () {
  return function (scope, element, attrs) {
    element.bind('keydown keypress', enter);

    scope.$on('$destroy', function () {
      element.unbind('keydown keypress', enter);
    });

    /**
     * Enter
     */

    function enter (event) {
      if (event.which === 13) {
        scope.$apply(function () {
          scope.$eval(attrs.scEnter, {
            'event': event
          });
        });

        event.preventDefault();
      }
    }
  };
});

'use strict';

/*!
 * sc-list
 * Copyright(c) 2014 Madhusudhan Srinivasa <madhu@changer.nl>
 * MIT Licensed
 */

/**
 * sc-list
 *
 * Usage:
 *
 *    var list = new List(Item);
 *    list.fetch(); // or list.refresh();
 *    list.sort('name', -1);
 */

angular.module('sc-list', [])

/**
 * List defaults
 */

.constant('scListDefaults', {
  limit: 20,
  page: 0,
  sort_type: 1
})

.factory('scList', ['scListDefaults', function (defaults) {

  /**
   * List
   *
   * @param {Resource} Resource
   * @param {Object} options
   * @api public
   */

  function List (Resource, options) {
    if (!Resource || constructorName(Resource) !== 'Resource') {
      throw new Error('Resource must be an instance of $resource');
    }

    if (typeof Resource.query !== 'function') {
      throw new Error('Resource must have a query function');
    }

    options = options || {};
    this.options = {};
    angular.extend(this.options, options);
    this.options.limit = options.limit || defaults.limit;
    this.options.page = options.page || defaults.page;
    this.options.sort_by = options.sort_by;
    this.options.sort_type = options.sort_type || defaults.sort_type;
    this.Resource = Resource;
  }

  function constructorName (fn) {
    return fn.toString().split('(')[0].split(/function\s*/)[1];
  }

  /**
   * sort
   *
   * @param {String} field
   * @param {Integer} type (1 or -1)
   * @return {Array}
   * @api public
   */

  List.prototype.sort = function (field, type) {
    this.options.sort_type = parseInt(this.options.sort_type, 10) * -1;
    return this.fetch({
      sort_type: type * this.options.sort_type,
      sort_by: field
    });
  };

  /**
   * goto
   *
   * @param {Number} page
   * @return {Array}
   * @api public
   */

  List.prototype.goto = function (page) {
    this.options.page = parseInt(page, 10);
    return this.fetch();
  };

  /**
   * load more
   *
   * @return {Array}
   * @api public
   */

  List.prototype.more = function () {
    var pageNo = this.items && this.items.length
      ? this.options.page + 1
      : this.options.page;

    return this.fetch({ page: pageNo }, true);
  };

  /**
   * fetch
   *
   * @param {Object} options
   * @return {Array}
   * @api public
   */

  List.prototype.refresh =
  List.prototype.fetch = function (options, append) {
    var self = this;
    options = options || {};

    angular.extend(this.options, options);
    var items = this.Resource.query(this.options, function (res, headers) {
      self.headers = headers();
    });

    if (!this.items) this.items = [];
    this.items['$promise'] = items.$promise;
    this.$promise = items.$promise;
    items.$promise.then(function () {
      if (append) {
        self.items.push.apply(self.items, items);
      } else {
        self.items = items;
      }
    });

    return items;
  };

  return List;
}]);

'use strict';

/*!
 * sc-listing
 * Copyright(c) 2014 Madhusudhan Srinivasa <madhu@changer.nl>
 * MIT Licensed
 */

/**
 * sc-listing
 *
 * Usage:
 *
 *  <listing
 *    items="items"
 *    on-item-click="showItem"
 *    class="'items'"
 *    item-class="'item'"
 *    template-url="'/templates/list-item.html'">
 *  </listing>
 *
 * it also takes `template` as an attribute which is just a template string
 */

angular.module('sc-listing', [])

.directive('scListing', [
  '$compile', '$http', '$q', '$templateCache',
  function ($compile, $http, $q, $templateCache) {
    return {
      restrict: 'E',
      link: function ($scope, element, attrs) {
        var scope = $scope.$new();
        var isDefined = angular.isDefined;
        var deferred = $q.defer();
        var promise = deferred.promise;
        var classes = ['list sc-list'];
        var itemClass = ['list-item sc-list-item'];
        var template;
        var templateUrl;

        $scope.$on('$destroy', function () {
          scope.$destroy();
        });

        // Parse attrs

        // on-item-click
        if (isDefined(attrs.onItemClick)) {
          scope.onItemClick = $scope.$eval(attrs.onItemClick);
        }

        // template and template-url
        if (isDefined(attrs.template)) {
          template = $scope.$eval(attrs.template);
          deferred.resolve(template);
        } else if (isDefined(attrs.templateUrl)) {
          templateUrl = $scope.$eval(attrs.templateUrl);
          $http.get(templateUrl, { cache: $templateCache })
            .success(function (html) {
              deferred.resolve(html);
            })
            .error(deferred.reject);
        } else {
          deferred.resolve('');
        }

        // class
        if (isDefined(attrs.class)) {
          classes.push(attrs.class);
        }

        // item-class
        if (isDefined(attrs.itemClass)) {
          itemClass.push($scope.$eval(attrs.itemClass));
        }

        // active
        scope.active = isDefined(attrs.active)
          ? $scope.$eval(attrs.active)
          : angular.noop;

        $scope.$watch(attrs['items'], function (items) {
          scope.items = items;
        });

        $scope.$watch(attrs['ngModel'], function (ngModel) {
          scope.ngModel = ngModel;
        });

        classes = classes.join(' ');
        itemClass = itemClass.join(' ');

        promise.then(function (tpl) {
          tpl = tpl || '{{ item | json }}';

          var template = [
            '<ul class="'+ classes +'">',
            '  <li class="'+ itemClass +'" ng-repeat="item in items track by $index" ng-click="onItemClick(item, $index)" ng-class="{ \'active\': active(item), \'last\': $last, \'first\': $first }" }">',
            '    '+ tpl,
            '  </li>',
            '</ul>'
          ].join('');

          element.replaceWith($compile(template)(scope));
        });
      }
    };
}]);

// TODO: give a provider to override defaults

//# sourceMappingURL=sc-components.js.map