define(function (require) {
  require('components/paginated_table/paginated_table');
  require('services/compile_recursive_directive');
  require('css!components/agg_table/agg_table.css');

  require('modules')
  .get('kibana')
  .directive('kbnAggTable', function ($filter, config, Private, compileRecursiveDirective) {
    var _ = require('lodash');

    var orderBy = $filter('orderBy');

    return {
      restrict: 'E',
      template: require('text!components/agg_table/agg_table.html'),
      scope: {
        table: '=',
        perPage: '=?'
      },
      controllerAs: 'aggTable',
      compile: function ($el) {
        // Use the compile function from the RecursionHelper,
        // And return the linking function(s) which it returns
        return compileRecursiveDirective.compile($el);
      },
      controller: function ($scope) {
        var self = this;

        self.sort = null;
        self._saveAs = require('file_saver');
        self.csv = {
          separator: config.get('csv:separator'),
          quoteValues: config.get('csv:quoteValues')
        };

        self.exportAsCsv = function () {
          var csv = new Blob([self.toCsv()], { type: 'text/plain' });
          self._saveAs(csv, self.csv.filename);
        };


        self.toCsv = function () {
          var rows = $scope.table.rows;
          var columns = $scope.table.columns;
          var nonAlphaNumRE = /[^a-zA-Z0-9]/;
          var allDoubleQuoteRE = /"/g;

          function escape(val) {
            val = String(val);
            if (self.csv.quoteValues && nonAlphaNumRE.test(val)) {
              val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
            }
            return val;
          }

          // escape each cell in each row
          var csvRows = rows.map(function (row, i) {
            return row.map(escape);
          });

          // add the columns to the rows
          csvRows.unshift(columns.map(function (col) {
            return escape(col.title);
          }));

          return csvRows.map(function (row) {
            return row.join(self.csv.separator) + '\r\n';
          }).join('');
        };

        $scope.$watch('table', function () {
          var table = $scope.table;

          if (!table) {
            $scope.formattedRows = null;
            $scope.formattedColumns = null;
            return;
          }

          setFormattedRows(table);
          setFormattedColumns(table);
        });

        function setFormattedColumns(table) {
          $scope.formattedColumns = table.columns.map(function (col, i) {
            var formattedColumn = {
              title: col.title
            };

            var agg = $scope.table.aggConfig(col);
            var last = i === (table.columns.length - 1);

            if (last || (agg.schema.group === 'metrics')) {
              formattedColumn.class = 'visualize-table-right';
            }

            return formattedColumn;
          });
        }

        function setFormattedRows(table) {
          var formatters = table.columns.map(function (col) {
            return table.fieldFormatter(col);
          });

          // format all row values
          $scope.formattedRows = ($scope.formattedRows || table.rows).map(function (row) {
            return row.map(function (cell, i) {
              return formatters[i](cell);
            });
          });

          // update the csv file's title
          self.csv.filename = (table.title() || 'table') + '.csv';
        }
      }
    };
  });
});
