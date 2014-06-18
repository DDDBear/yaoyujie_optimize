var Constants = {
    DELETE_RULE_URL: 'rest/config/deleteRuleById',
    MODIFY_RULE_URL: 'rest/config/modifyRuleById',
    FETCH_CONTACT_URL: 'rest/contact/all',
    RERUN_DQ_URL: 'rest/monitor/rerun',
    GET_DAILY_REPORT_URL: 'rest/monitor/getDailyReport',
    SEARCH_RULE_URL: 'rest/monitor/searchRule',
    SEARCH_TABLE_RULE_URL: 'rest/monitor/searchTableRule',
    FETCH_DB_URL: 'rest/queryTable/db',
    FETCH_DS_URL: 'rest/queryTable/ds',
    SCHEDULE_RERUN_URL: 'http://data.dp/halley/task-monitor.html',

    RECORD_CNT_DQ_VAL: 100,
    COLUMN_CNT_DQ_VAL: 101,
    PARTITION_DQ_VAL: 102,
    NULL_COUNT_DQ_VAL: 200,
    MIN_VALUE_DQ_VAL: 201,
    AVG_VALUE_DQ_VAL: 202,
    MAX_VALUE_DQ_VAL: 203,
    EMPTY_VALUE_DQ_VAL: 204,
    SPECIAL_CHAR_DQ_VAL: 205,
    REPETITION_RATE_DQ_VAL: 206,
    CUSTOM_PROFILE_DQ_VAL: 250,
    EXTEND_RULE_DQ_VAL: 251,

    PRIORITY_UNSET: 0,
    PRIORITY_HIGH: 1,
    PRIORITY_MEDIUM: 2,
    PRIORITY_LOW: 3,

    EXPR_RESULT_NOT_SET: 0,
    EXPR_RESULT_SUCCESS: 1,
    EXPR_RESULT_FAIL: 2
};

var allContact = [];

$(function($) {
    initExtraComponent();
});

// 初始化控件
var initExtraComponent = function() {
    // 日历控件
    initDatePicker();

    // 提示框控件
    initTooltip();

    $('body').on('keydown', function(eventObject) {
        // Escape
        if (eventObject.keyCode == 27) {
            $.gritter.removeAll();
        }
    });
};

var init = function() {
    $.ajaxSetup({
        headers: {
            token: encodeURIComponent(window.token)
        },
        dataType: 'json',
        error: ajaxErrorHandler
    });
    bindEvent();
    initPage();
    initSelector();
    fetchDailyDQ();
};

/**
 * ------------------------------
 * 页面
 * ------------------------------
 */
// 初始化页面
var initPage = function() {
    $('#sidebar-collapse').click();
};

// 绑定事件
var bindEvent = function() {
    // 绑定查询按钮
    $('#query-table-submit-btn').on(ace.click_event, queryTableSubmitBtnClick);
    $('#query-table-ds-name').on('change', queryTableDsNameChange);
    $('#query-table-tbl-name').on('keydown', function(eventObject) {
        // 回车
        if (eventObject.keyCode == 13) {
            $('#query-table-submit-btn').trigger(ace.click_event);
        }
    });

    $('body').on(ace.click_event, '.table-tab-h3', tableTabClick);
    $('body').on(ace.click_event, '.schedule-rerun', scheduleRerunClick);
    $('body').on(ace.click_event, '.dq-rerun', dqRerunClick);
    $('body').on(ace.click_event, '.modify-dq-btn', modifyDqBtnClick);
    $('body').on(ace.click_event, '.delete-dq-btn', deleteDqBtnClick);
};

// 初始化左侧选择栏
var initSelector = function() {
    // 数据日期，设为昨天
    var yesterday = new Date();
    yesterday.setTime(yesterday.getTime() - 1 * 24 * 60 * 60 * 1000);
    $('#query-table-schedule-time').val($.datepicker.formatDate('yy-mm-dd', yesterday));

    $('#query-table-submit-btn').attr('disabled', 'disabled');

    var $allChoice = $('<option>').attr('value', '').html('全部');

    // 获取所有联系人信息
    $.ajax({
        type: 'GET',
        url: Constants.FETCH_CONTACT_URL
    }).done(function(data, textStatus, jqXHR) {
        allContact = [];
        $.each(data, function(i, val) {
            allContact.push([val.loginId, val.realName]);
        });

        var $owner = $('#query-table-owner');
        $owner.empty().append($allChoice);
        $.each(data, function(i, val) {
            var $option = $('<option>').attr('value', val.loginId).html(escapeHTML(val.realName));
            if (window.loginID == val.loginId) {
                $option.attr('selected', 'selected');
            }
            $owner.append($option);
        });
    }).always(function() {
        $('#query-table-submit-btn').removeAttr('disabled');
    });

    // 获取数据源和数据库
    var $dsName = $('#query-table-ds-name');
    $dsName.empty().append($allChoice);
    $('#query-table-db-name').empty();
    $('#query-table-tbl-name').empty();

    $.ajax({
        type: 'GET',
        url: Constants.FETCH_DS_URL
    }).done(function(data, textStatus, jqXHR) {
        $.each(data, function(i, val) {
            $dsName.append($('<option>').attr('value', val).html(escapeHTML(val)));
        });
        $dsName.find(':first').attr('selected', 'selected');
        $dsName.change();
    });
};

// 查询表单提交
var queryTableSubmitBtnClick = function(eventObject) {
    var $queryTableSubmitBtn = $('#query-table-submit-btn');

    var scheduleTimeVal = $('#query-table-schedule-time').val();
    var statusVal = $('#query-table-status').val();
    var priorityVal = $('#query-table-priority').val();
    var ownerVal = $('#query-table-owner').val();
    var dsNameVal = $('#query-table-ds-name').val();
    var dbNameVal = $('#query-table-db-name').val();
    var tblNameVal = $('#query-table-tbl-name').val();

    $queryTableSubmitBtn.attr('disabled', 'disabled');

    // 校验
    if (isEmpty(scheduleTimeVal)) {
        $queryTableSubmitBtn.removeAttr('disabled');
        alertError('日期不能为空');
        return;
    }

    $.ajax({
        type: 'GET',
        url: Constants.SEARCH_RULE_URL,
        data: encodeForm({
            scheduleTime: scheduleTimeVal,
            status: statusVal,
            priority: priorityVal,
            owner: ownerVal,
            datasourceName: dsNameVal,
            databaseName: dbNameVal,
            tableName: tblNameVal
        })
    }).done(function(data, textStatus, jqXHR) {
        if (!data || data.length == 0) {
            alertInfo('查询结果为空');
        }
        var monitorContainer = $('#monitor-container');
        monitorContainer.empty();
        $.each(data, function(idx, comp) {
            var $tbody = $('<tbody>');

            var $tab = $('<div class="group">').attr('schedule-time', scheduleTimeVal).attr('table-id', comp.table.tableId);

            var contactList = comp.table.contactList;
            var contactArr = contactList.split(',');
            var contactNameArr = [];
            for (var i = contactArr.length - 1; i >= 0; --i) {
                for (var j = allContact.length - 1; j >= 0; --j) {
                    if (contactArr[i] == allContact[j][0]) {
                        contactNameArr.push(allContact[j][1]);
                    }
                }
            }

            $tab.append($('<h3 class="accordion-header table-tab-h3">').html(comp.table.datasourceName + ' - ' + comp.table.databaseName + ' - ' + comp.table.tableName
                        + (comp.summary[2] == 0 ? '' : '<small class="margin-10">失败<span class="badge badge-danger">' + comp.summary[2] + '</span></small>')
                        + (comp.summary[1] == 0 ? '' : '<small class="margin-10">未完成<span class="badge badge-warning">' + comp.summary[1] + '</span></small>')
                        + (comp.summary[0] == 0 ? '' : '<small class="margin-10">成功<span class="badge badge-success">' + comp.summary[0] + '</span></small>')
                        + '<small class="margin-10">[负责人: ' + (contactNameArr.length == 0 ? '无' : contactNameArr) + ']</small>' 
                        + '<span class="badge badge-info margin-10 pointer-effect schedule-rerun"><i class="icon-play"></i>&nbsp;调度重跑</span>&nbsp;<span class="badge badge-info margin-10 pointer-effect dq-rerun"><i class="icon-play"></i>&nbsp;数据质量重跑</span>'));
            var $row = $('<div class="row">');
            if (comp.ruleList) {
                $.each(comp.ruleList, function(idx1, ruleMap) {
                    var $tr = $('<tr>');
                    var rule = ruleMap.rule;
                    var ruleHistory = ruleMap.ruleHistory;
                    if (ruleHistory) {
                        rule = ruleHistory;
                    }
                    $tr.attr('rule-id', rule.ruleId);
                    $tr.attr('priority', rule.priority);
                    $tr.attr('table-id', rule.tableId);
                    $tr.attr('column-id', rule.columnId);
                    $tr.attr('rule-type', rule.ruleType);
                    $tr.attr('profile-config', rule.profileConfig);
                    $tr.attr('rule-config', rule.ruleConfig);
                    $tr.attr('rule-sql', rule.ruleSQL);
                    if (ruleHistory && ruleHistory.expressionResult == Constants.EXPR_RESULT_FAIL) {
                        $tr.append($('<td><span class="bolder red">失败</span></td>'));
                    } else if (ruleHistory && ruleHistory.expressionResult == Constants.EXPR_RESULT_SUCCESS) {
                        $tr.append($('<td><span class="bolder green">成功</span></td>'));
                    } else {
                        $tr.append($('<td><span class="bolder blue">未完成</span></td>'));
                    }
                    if (ruleHistory && ruleHistory.priority == Constants.PRIORITY_HIGH) {
                        $tr.append($('<td>高</td>'));
                    } else if (ruleHistory && ruleHistory.priority == Constants.PRIORITY_MEDIUM) {
                        $tr.append($('<td>中</td>'));
                    } else if (ruleHistory && ruleHistory.priority == Constants.PRIORITY_LOW) {
                        $tr.append($('<td>低</td>'));
                    } else {
                        $tr.append($('<td>未设置</td>'));
                    }
                    var ruleTypeStr;
                    if (ruleHistory && ruleHistory.ruleType == Constants.RECORD_CNT_DQ_VAL) {
                        ruleTypeStr = '总记录数';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.COLUMN_CNT_DQ_VAL) {
                        ruleTypeStr = '列数';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.PARTITION_DQ_VAL) {
                        ruleTypeStr = '分区键';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.NULL_COUNT_DQ_VAL) {
                        ruleTypeStr = ruleMap.column.columnName + ': NULL值数';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.MIN_VALUE_DQ_VAL) {
                        ruleTypeStr = ruleMap.column.columnName + ': 最小值 | 最小长度';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.AVG_VALUE_DQ_VAL) {
                        ruleTypeStr = ruleMap.column.columnName + ': 平均值 | 平均长度';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.MAX_VALUE_DQ_VAL) {
                        ruleTypeStr = ruleMap.column.columnName + ': 最大值 | 最大长度';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.EMPTY_VALUE_DQ_VAL) {
                        ruleTypeStr = ruleMap.column.columnName + ': 0 | 空字符数';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.SPECIAL_CHAR_DQ_VAL) {
                        ruleTypeStr = ruleMap.column.columnName + ': 特殊字符数';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.REPETITION_RATE_DQ_VAL) {
                        ruleTypeStr = ruleMap.column.columnName + ': 重复率';
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.CUSTOM_PROFILE_DQ_VAL) {
                        ruleTypeStr = '自定义探查: ' + (ruleHistory.profileConfig ? ruleHistory.profileConfig : '无');
                    } else if (ruleHistory && ruleHistory.ruleType == Constants.EXTEND_RULE_DQ_VAL) {
                        ruleTypeStr = '同环比'; // TODO complete
                    } else {
                        ruleTypeStr = '未知';
                    }
                    $tr.append($('<td>' + ruleTypeStr + '</td>'));
                    if (ruleHistory && ruleHistory.ruleConfig) {
                        $tr.append($('<td>' + ruleHistory.ruleConfig + '</td>'));
                    } else {
                        $tr.append($('<td>'));
                    }
                    if (ruleHistory && ruleHistory.result) {
                        $tr.append($('<td>' + fixed(ruleHistory.result) + '</td>'));
                    } else {
                        $tr.append($('<td>'));
                    }
                    $tr.append($('<td><span class="badge badge-purple pointer-effect modify-dq-btn"><i class="icon-pencil bigger-120"></i></span>&nbsp;<span class="badge badge-danger pointer-effect delete-dq-btn"><i class="icon-trash"></i></span></td>'));
                    $tbody.append($tr);
                });
                $row.append($('<div class="table-responsive">')
                        .append($('<table class="table table-bordered table-striped table-hover no-margin">')
                            .append($('<thead>')
                                .append($('<tr>')
                                    .append($('<th>状态</th>'))
                                    .append($('<th>优先级</th>'))
                                    .append($('<th>数据质量类型</th>'))
                                    .append($('<th>取值范围</th>'))
                                    .append($('<th>实际值</th>'))
                                    .append($('<th>操作</th>'))
                                )
                            )
                            .append($tbody)
                        )
                    );
            }
            $tab.append($row);
            monitorContainer.append($tab);
        });
    }).always(function() {
        $queryTableSubmitBtn.removeAttr('disabled');

        $('.accordion').accordion({
            animate: 250,
            collapsible: true,
            disabled: false,
            header: '.accordion-header',
            heightStyle: 'content'
        });
        $('.accordion').accordion('refresh');
    });
};

// query-table中数据源变化时更新数据库下拉框
var queryTableDsNameChange = function() {
    var $queryTableDsName = $('#query-table-ds-name');
    var $queryTableDbName = $('#query-table-db-name');

    $queryTableDbName.empty().append($('<option>').attr('value', '').html('全部'));

    var queryTableDsNameVal = $queryTableDsName.val();
    if (isNotEmpty(queryTableDsNameVal)) {
        $.ajax({
            type: 'GET',
            url: Constants.FETCH_DB_URL,
            data: encodeForm({
                datasourceName: queryTableDsNameVal
            })
        }).done(function(data, textStatus, jqXHR) {
//            $queryTableDbName.append($('<option>').attr('value', '').html('全部'));
            $.each(data, function(i, val) {
                $queryTableDbName.append($('<option>').attr('value', val).html(escapeHTML(val)));
            });
            // 模型同学是最大的客户，方便之
            if (queryTableDsNameVal == 'hive') {
                $queryTableDbName.find('[value="bi"]').attr('selected','selected');
            }
        });
    }
};

// 获取每日质量报告
var fetchDailyDQ = function() {
    $.ajax({
        type: 'GET',
        url: Constants.GET_DAILY_REPORT_URL
    }).done(function(data, textStatus, jqXHR) {
        var text = '';
        if (data.high.length > 0) {
            text += '<p>高优先级:</p>';
            text += '<ul>';
            $.each(data.high, function(i, val) {
                var arr = val.split(';');
                var datasourceName = arr[0];
                var databaseName = arr[1];
                var tableName = arr[2];
                var scheduleTime = arr[3];
                var li = '';
                li += '<span class="gritter-noti pointer-effect" datasourceName="' + datasourceName + 
                        '" databaseName="' + databaseName + '" tableName="' + tableName + 
                        '" scheduleTime="' + scheduleTime + '">';
                li += tableName + " - " + scheduleTime;
                li += '</span>';
                text += '<li>' + li + '</li>';
            });
            text += '</ul>';
        }
        if (data.medium.length > 0) {
            text += '<p>中优先级:</p>';
            text += '<ul>';
            $.each(data.medium, function(i, val) {
                var arr = val.split(';');
                var datasourceName = arr[0];
                var databaseName = arr[1];
                var tableName = arr[2];
                var scheduleTime = arr[3];
                var li = '';
                li += '<span class="gritter-noti pointer-effect" datasourceName="' + datasourceName + 
                        '" databaseName="' + databaseName + '" tableName="' + tableName + 
                        '" scheduleTime="' + scheduleTime + '">';
                li += tableName + " - " + scheduleTime;
                li += '</span>';
                text += '<li>' + li + '</li>';
            });
            text += '</ul>';
        }
        if (data.low.length > 0) {
            text += '<p>低优先级:</p>';
            text += '<ul>';
            $.each(data.low, function(i, val) {
                var arr = val.split(';');
                var datasourceName = arr[0];
                var databaseName = arr[1];
                var tableName = arr[2];
                var scheduleTime = arr[3];
                var li = '';
                li += '<span class="gritter-noti pointer-effect" datasourceName="' + datasourceName + 
                        '" databaseName="' + databaseName + '" tableName="' + tableName + 
                        '" scheduleTime="' + scheduleTime + '">';
                li += tableName + " - " + scheduleTime;
                li += '</span>';
                text += '<li>' + li + '</li>';
            });
            text += '</ul>';
        }

        if (text) {
            $.gritter.add({
                title: '今日数据质量报告（ESC清除）',
                text: '<p>您有以下数据质量未处理，请及时进行修复！</p>' + text,
                class_name: 'gritter-error gritter-msg',
                sticky: true
            });
        }
    });
};

var tableTabClick = function() {
    var $me = $(this).parent();
    var scheduleTime = $me.attr('schedule-time');
    var tableId = $me.attr('table-id');
    var $row = $me.find('div');
    if ($row) {
        $row.empty();
    }
    $.ajax({
        type: 'GET',
        url: Constants.SEARCH_TABLE_RULE_URL,
        data: encodeForm({
            scheduleTime: scheduleTime,
            tableId: tableId
        })
    }).done(function(data, textStatus, jqXHR) {
        var comp;
        if (data && data.length == 1) {
            comp = data[0];
        }
        var $tbody = $('<tbody>');
        if (comp.ruleList) {
            $.each(comp.ruleList, function(idx, ruleMap) {
                var $tr = $('<tr>');
                var rule = ruleMap.rule;
                var ruleHistory = ruleMap.ruleHistory;
                if (ruleHistory) {
                    rule = ruleHistory;
                }
                $tr.attr('rule-id', rule.ruleId);
                $tr.attr('priority', rule.priority);
                $tr.attr('table-id', rule.tableId);
                $tr.attr('column-id', rule.columnId);
                $tr.attr('rule-type', rule.ruleType);
                $tr.attr('profile-config', rule.profileConfig);
                $tr.attr('rule-config', rule.ruleConfig);
                $tr.attr('rule-sql', rule.ruleSQL);
                if (ruleHistory && ruleHistory.expressionResult == '2') {
                    $tr.append($('<td><span class="bolder red">失败</span></td>'));
                } else if (ruleHistory && ruleHistory.expressionResult == '1') {
                    $tr.append($('<td><span class="bolder green">成功</span></td>'));
                } else {
                    $tr.append($('<td><span class="bolder blue">未完成</span></td>'));
                }
                if (rule && rule.priority == Constants.PRIORITY_HIGH) {
                    $tr.append($('<td>高</td>'));
                } else if (rule && rule.priority == Constants.PRIORITY_MEDIUM) {
                    $tr.append($('<td>中</td>'));
                } else if (rule && rule.priority == Constants.PRIORITY_LOW) {
                    $tr.append($('<td>低</td>'));
                } else {
                    $tr.append($('<td>未设置</td>'));
                }
                var ruleTypeStr;
                if (rule && rule.ruleType == Constants.RECORD_CNT_DQ_VAL) {
                    ruleTypeStr = '总记录数';
                } else if (rule && rule.ruleType == Constants.COLUMN_CNT_DQ_VAL) {
                    ruleTypeStr = '列数';
                } else if (rule && rule.ruleType == Constants.PARTITION_DQ_VAL) {
                    ruleTypeStr = '分区键';
                } else if (rule && rule.ruleType == Constants.NULL_COUNT_DQ_VAL) {
                    ruleTypeStr = ruleMap.column.columnName + ': NULL值数';
                } else if (rule && rule.ruleType == Constants.MIN_VALUE_DQ_VAL) {
                    ruleTypeStr = ruleMap.column.columnName + ': 最小值 | 最小长度';
                } else if (rule && rule.ruleType == Constants.AVG_VALUE_DQ_VAL) {
                    ruleTypeStr = ruleMap.column.columnName + ': 平均值 | 平均长度';
                } else if (rule && rule.ruleType == Constants.MAX_VALUE_DQ_VAL) {
                    ruleTypeStr = ruleMap.column.columnName + ': 最大值 | 最大长度';
                } else if (rule && rule.ruleType == Constants.EMPTY_VALUE_DQ_VAL) {
                    ruleTypeStr = ruleMap.column.columnName + ': 0 | 空字符数';
                } else if (rule && rule.ruleType == Constants.SPECIAL_CHAR_DQ_VAL) {
                    ruleTypeStr = ruleMap.column.columnName + ': 特殊字符数';
                } else if (rule && rule.ruleType == Constants.REPETITION_RATE_DQ_VAL) {
                    ruleTypeStr = ruleMap.column.columnName + ': 重复率';
                } else if (rule && rule.ruleType == Constants.CUSTOM_PROFILE_DQ_VAL) {
                    ruleTypeStr = '自定义探查: ' + (rule.profileConfig ? rule.profileConfig : '无');
                } else if (rule && rule.ruleType == Constants.EXTEND_RULE_DQ_VAL) {
	                if (rule.profileConfig == 1) {
		                ruleTypeStr = '日环比';
	                } else if (rule.profileConfig == 2) {
		                ruleTypeStr = '日增量';
	                }
                } else {
                    ruleTypeStr = '未知';
                }
                $tr.append($('<td>' + ruleTypeStr + '</td>'));
                if (rule && rule.ruleConfig) {
                    $tr.append($('<td>' + rule.ruleConfig + '</td>'));
                } else {
                    $tr.append($('<td></td>'));
                }
                if (ruleHistory && ruleHistory.result) {
                    $tr.append($('<td>' + (ruleHistory.result ? fixed(parseFloat(ruleHistory.result).toString()) : '空') + '</td>'));
                } else {
                    $tr.append($('<td></td>'));
                }
                $tr.append($('<td><span class="badge badge-purple pointer-effect modify-dq-btn"><i class="icon-pencil bigger-120"></i></span>&nbsp;<span class="badge badge-danger pointer-effect delete-dq-btn"><i class="icon-trash"></i></span></td>'));
                $tbody.append($tr);
            });
            $row.append($('<div class="table-responsive">')
                    .append($('<table class="table table-bordered table-striped table-hover no-margin">')
                        .append($('<thead>')
                            .append($('<tr>')
                                .append($('<th>状态</th>'))
                                .append($('<th>优先级</th>'))
                                .append($('<th>数据质量类型</th>'))
                                .append($('<th>取值范围</th>'))
                                .append($('<th>实际值</th>'))
                                .append($('<th>操作</th>'))
                            )
                        )
                        .append($tbody)
                    )
                );
        }
    }).always(function() {
        $('.accordion').accordion({
            animate: 250,
            collapsible: true,
            disabled: false,
            header: '.accordion-header',
            heightStyle: 'content'
        });
        $('.accordion').accordion('refresh');
        $('.modify-dq-btn').off(ace.click_event).on(ace.click_event, modifyDqBtnClick);
        $('.delete-dq-btn').off(ace.click_event).on(ace.click_event, deleteDqBtnClick);
    });
};

var deleteDqBtnClick = function() {
    var $me = $(this);
    var $tr = $me.parent().parent();
    var ruleIdVal = $tr.attr('rule-id');
    $.ajax({
        type: 'DELETE',
        url: Constants.DELETE_RULE_URL,
        data: encodeForm({
            ruleId: ruleIdVal
        })
    }).done(function(data, textStatus, jqXHR) {
        alertInfo('删除成功');
        $tr.addClass('delete-tr');
        $me.parent().html('');
    }).always(function() {
        $('#dq-table-config-modal-delete-btn').removeAttr('disabled');
        $('#dq-table-config-modal-finish-btn').removeAttr('disabled');
    });
};

var modifyDqBtnClick = function() {
    $('#dq-monitor-config-modal').modal('show');
    var $me = $(this);
    var $tr = $me.parent().parent();
    var ruleIdVal = $tr.attr('rule-id');
    var rulePriorityVal = $tr.attr('priority');
    var tableIdVal = $tr.attr('table-id');
    var columnIdVal = $tr.attr('column-id');
    var ruleTypeVal = $tr.attr('rule-type');
    var profileConfigVal = $tr.attr('profile-config');
    var ruleConfigVal = $tr.attr('rule-config');
    $('#dq-config-modal-rule-id').val(ruleIdVal);
    $('input[name=dq-config-modal-priority]:checked').removeAttr('checked');
    $('input[name=dq-config-modal-priority][value=' + rulePriorityVal + ']').trigger(ace.click_event);
    $('#dq-config-modal-table-id').val(tableIdVal);
    $('#dq-config-modal-column-id').val(columnIdVal);
    $('#dq-config-modal-rule-type').attr('disabled', 'disabled');
    $('#dq-config-modal-rule-type').val(ruleTypeVal);
    if (profileConfigVal == Constants.CUSTOM_PROFILE_DQ_VAL) {
        $('#dq-config-modal-profile-config-div').show();
    } else {
        $('#dq-config-modal-profile-config-div').hide();
    }
    $('#dq-config-modal-profile-config').val(profileConfigVal);
    $('#dq-config-modal-profile-config').attr('disabled', 'disabled');
    $('#dq-config-modal-rule-config').val(ruleConfigVal);
    if (ruleTypeVal == Constants.CUSTOM_PROFILE_DQ_VAL) {
        alertInfo('正在检查探查条件，需要一定时间，请等待！');
    }
    $('#dq-config-modal-finish-btn').off(ace.click_event).on(ace.click_event, function(event) {
        $.ajax({
            type: 'POST',
            url: Constants.MODIFY_RULE_URL,
            data: encodeForm({
                ruleId: $('#dq-config-modal-rule-id').val(),
                tableId: $('#dq-config-modal-table-id').val(),
                columnId: $('#dq-config-modal-column-id').val(),
                priority: $('input[name=dq-config-modal-priority]:checked').val(),
                ruleType: $('#dq-config-modal-rule-type').val(),
                profileConfig: $('#dq-config-modal-profile-config').val(),
                ruleConfig: $('#dq-config-modal-rule-config').val(),
                ruleSQL: ''
            })
        }).done(function(data, textStatus, jqXHR) {
            alertInfo('修改成功');
        }).always(function() {
            $('#dq-table-config-modal-delete-btn').removeAttr('disabled');
            $('#dq-table-config-modal-finish-btn').removeAttr('disabled');
        });
    });
};

var scheduleRerunClick = function() {
    window.open(Constants.SCHEDULE_RERUN_URL);
};

var dqRerunClick = function() {
    var $me = $(this);
    var group = $me.parent().parent();
    $.ajax({
        type: 'POST',
        url: Constants.RERUN_DQ_URL,
        data: encodeForm({
            tableId: group.attr('table-id'),
            scheduleTime: group.attr('schedule-time')
        })
    }).done(function(data, textStatus, jqXHR) {
        alertInfo('已成功提交数据质量重跑请求');
    });
};
