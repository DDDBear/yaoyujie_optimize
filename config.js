var Constants = {
    FETCH_CONTACT_URL: 'rest/contact/all',
    CHANGE_CONTACT_URL: 'rest/config/changeContact',
    FETCH_DS_URL: 'rest/queryTable/ds',
    FETCH_DB_URL: 'rest/queryTable/db',
    QUERY_TABLE_URL: 'rest/queryTable/query',
    OPEN_TABLE_URL: 'rest/config/openTable',
    RUN_PROFILE_URL: 'rest/profile/run',
    GET_RULE_LIST_BY_COLUMN_ID_URL: 'rest/config/getRuleListByColumnId',
    MODIFY_RULE_URL: 'rest/config/modifyRuleById',
    DELETE_RULE_URL: 'rest/config/deleteRuleById',
    GET_RULE_CFG_URL: 'rest/config/getRuleConfig',

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

    NO_PRIO_BKGD: 'no-prio-bkgd',
    HIGH_PRIO_BKGD: 'high-prio-bkgd',
    MEDIUM_PRIO_BKGD: 'medium-prio-bkgd',
    LOW_PRIO_BKGD: 'low-prio-bkgd'
};

var isOpening = false;

$(function($) {
    initExtraComponent();
});

// 初始化控件
var initExtraComponent = function() {
    // 手风琴控件
    $('.accordion').accordion({
        active: false,
        animate: 250,
        collapsible: true,
        disabled: true,
        header: '.accordion-header',
        heightStyle: 'content'
    });

    // 日历控件
    initDatePicker();

    // 多选控件
    $('.chosen-select').chosen({
        width: '100%'
    });

    // 提示框控件
    initTooltip();
};

// 入口函数
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
    NotiUtil.start();
};

/**
 * ------------------------------
 * 页面
 * ------------------------------
 */
// 初始化页面
var initPage = function() {
    initQueryTable();
    loadContactList();
};

// 绑定事件
var bindEvent = function() {
    // ---------- COMMON ---------- //
    // 添加标题点击的展开收缩效果
    $('body').on(ace.click_event, '.widget-box .widget-title', function() {
        $(this).parent().find('.widget-toolbar .icon-chevron-up,.icon-chevron-down').trigger(ace.click_event);
    });

    // ---------- QUERY TABLE ---------- //
    // 数据源输入框，值改变时修改数据库的备选列表
    $('#query-table-ds-name').on('change', queryTableDsNameChange);
    // 查询按钮
    $('#query-table-submit-btn').on(ace.click_event, queryTableSubmitBtnClick);
    // 绑定回车事件
    $('#query-table-tbl-name').on('keydown', function(eventObject) {
        // 回车
        if (eventObject.keyCode == 13) {
            $('#query-table-submit-btn').trigger(ace.click_event);
        }
    });

    // ---------- MAIN ---------- //
    // 日期控件
    $('#main-schedule-time-selector').on('change', detailHeaderScheduleTimeChange);
    // 联系人选择控件
    $('#main-contact-list').on('change', detailHeaderContactListChange);
    // 探查按钮
    $('#main-run-btn').on(ace.click_event, runProfileBtnClick);
    // 记录数DQ配置
    $('#main-record-cnt-btn').on(ace.click_event, { ruleType: Constants.RECORD_CNT_DQ_VAL }, modifyTableDQBtnClick);
    // 列数DQ配置
    $('#main-column-cnt-btn').on(ace.click_event, { ruleType: Constants.COLUMN_CNT_DQ_VAL }, modifyTableDQBtnClick);
    // 分区键DQ配置
    $('#main-partition-btn').on(ace.click_event, { ruleType: Constants.PARTITION_DQ_VAL }, modifyTableDQBtnClick);
    // 新增自定义规则按钮
    $('#main-add-custom-rule-btn').on(ace.click_event, addCustomRuleBtnClick);

    // ---------- MODAL - DQ CONFIG ---------- //
    // 规则类型变化
    $('#modal-dq-config-rule-type').on('change', dqConfigModalRuleTypeChange);
	// 关联规则类型变化
	$('#modal-dq-config-related-rule').on('change', dqConfigModalRelatedRuleChange);
    // 完成按钮
    $('#modal-dq-config-finish-btn').on(ace.click_event, dqFinishBtnClick);
    // 编辑按钮（多个）
    $('body').on(ace.click_event, '.modal-dq-config-edit-dq-btn', dqEditBtnClick);
    // 删除按钮（多个）
    $('body').on(ace.click_event, '.modal-dq-config-delete-dq-btn', dqDeleteBtnClick);
    // 取消按钮
    $('#modal-dq-config-cancel-btn').on(ace.click_event, dqCancelBtnClick);

    // ---------- MODAL - TABLE DQ CONFIG ---------- //
    // 删除按钮
    $('#modal-table-dq-config-delete-btn').on(ace.click_event, tableConfigModalDeleteBtnClick);
    // 完成按钮
    $('#modal-table-dq-config-finish-btn').on(ace.click_event, tableConfigModalFinishBtnClick);

    // ---------- GRITTER ---------- //
    $('body').on(ace.click_event, '#gritter-notice-wrapper span', gritterNotiClick);
    $('body').on('keydown', function(eventObject) {
        // Escape
        if (eventObject.keyCode == 27) {
            $.gritter.removeAll();
        }
    });
};

// 加载负责人全量列表
var loadContactList = function() {
    var detailHeaderContactList = $('#main-contact-list');
    detailHeaderContactList.empty();
    $.ajax({
        type: 'GET',
        url: Constants.FETCH_CONTACT_URL
    }).done(function(data, textStatus, jqXHR) {
        $.each(data, function(i, val) {
            detailHeaderContactList.append($('<option>').attr('value', val.loginId).html(escapeHTML(val.realName)));
        });
    });
};

var gritterNotiClick = function() {
    if ($(this).html().indexOf('完成') >= 0) {
        queryTableOpenBtnClick({
            data: {
                datasourceName: $(this).attr('datasourceName'),
                databaseName: $(this).attr('databaseName'),
                tableName: $(this).attr('tableName'),
                scheduleTime: $(this).attr('scheduleTime'),
                refresh: true,
                tabIndex: 1
            }
        });
    }
};

/**
 * ------------------------------
 * 
 * 查询表信息
 * 
 * ------------------------------
 */
// 初始化query-table
var initQueryTable = function() {
    var $queryTableDsName = $('#query-table-ds-name');
    $.ajax({
        type: 'GET',
        url: Constants.FETCH_DS_URL
    }).done(function(data, textStatus, jqXHR) {
        $.each(data, function(i, val) {
            $queryTableDsName.append($('<option>').attr('value', val).html(escapeHTML(val)));
        });
        $queryTableDsName.children().first().attr('selected','selected');
        $queryTableDsName.trigger('change');
    });
};

// query-table中数据源变化时更新数据库下拉框
var queryTableDsNameChange = function() {
    var $queryTableDsName = $('#query-table-ds-name');
    var $queryTableDbName = $('#query-table-db-name');

    $queryTableDbName.empty();

    var queryTableDsNameVal = $queryTableDsName.val();
    if (isNotEmpty(queryTableDsNameVal)) {
        $.ajax({
            type: 'GET',
            url: Constants.FETCH_DB_URL,
            data: {
                datasourceName: encodeURIComponent(queryTableDsNameVal)
            }
        }).done(function(data, textStatus, jqXHR) {
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

// 绑定query-table的查询按钮
var queryTableSubmitBtnClick = function(eventObject) {
    var $queryTableDsName = $('#query-table-ds-name');
    var $queryTableDbName = $('#query-table-db-name');
    var $queryTableTblName = $('#query-table-tbl-name');
    var $queryTableSubmitBtn = $('#query-table-submit-btn');

    var queryTableDsNameVal = $queryTableDsName.val();
    var queryTableDbNameVal = $queryTableDbName.val();
    var queryTableTblNameVal = $queryTableTblName.val();

    $('#query-table-result-table').hide();
    $('#query-table-result-table tbody').empty();
    $queryTableSubmitBtn.attr('disabled', 'disabled');

    if (isEmpty(queryTableDsNameVal)) {
        $queryTableSubmitBtn.removeAttr('disabled');
        alertError('数据源不能为空！');
        return;
    }

    if (isEmpty(queryTableDbNameVal)) {
        $queryTableSubmitBtn.removeAttr('disabled');
        alertError('数据库不能为空！');
        return;
    }

    $.ajax({
        type: 'GET',
        url: Constants.QUERY_TABLE_URL,
        data: {
            datasourceName: encodeURIComponent(queryTableDsNameVal),
            databaseName: encodeURIComponent(queryTableDbNameVal),
            tableName: encodeURIComponent(queryTableTblNameVal)
        }
    }).done(function(data, textStatus, jqXHR) {
        $.each(data, function(i, val) {
            var $queryTableOpenBtn = $('<span class="badge badge-purple pointer-effect query-table-open-btn"><i class="icon-external-link"></i>&nbsp;打开</span>');
            $queryTableOpenBtn.on(ace.click_event, {
                datasourceName: val.datasourceName,
                databaseName: val.databaseName,
                tableName: val.tableName,
                scheduleTime: '',
                refresh: true,
                tabIndex: 0
            }, queryTableOpenBtnClick);
            
            $('#query-table-result-table tbody')
                .append($('<tr>')
                    .append($('<td>').html(escapeHTML(val.datasourceName)))
                    .append($('<td>').html(escapeHTML(val.databaseName)))
                    .append($('<td>').html(escapeHTML(val.tableName)))
                    .append($('<td>').html($queryTableOpenBtn)));
        });
    }).always(function() {
        $('#query-table-result-table').fadeIn();
        $queryTableSubmitBtn.removeAttr('disabled');
    });
};

/**
 * ------------------------------
 * 
 * 数据质量详情
 * 
 * ------------------------------
 */
// 打开表（如果搜索后打开则为搜索最近一次跑过的记录）
var queryTableOpenBtnClick = function(event) {
    if (isOpening) {
        return;
    }
    isOpening = true;

    $('#main-schedule-time-selector').attr('disabled', 'disabled');
    $('#main-contact-list').attr('disabled', 'disabled');
    $('#main-run-btn').attr('disabled', 'disabled');

    var datasourceName = event.data.datasourceName;
    var databaseName = event.data.databaseName;
    var tableName = event.data.tableName;
    var refresh = event.data.refresh;
    var tabIndex = event.data.tabIndex;
    
    // check spec
    var allowedTablePrefix = [ "dpdm_", "dpdim_", "dpdw_", "dpmid_", "dpods_", "dprpt_" ];
    var ok = false;
    for (var i = allowedTablePrefix.length - 1; i >= 0; --i) {
        if (tableName.indexOf(allowedTablePrefix[i]) == 0) {
            ok = true;
        }
    }
    if (!ok) {
        alertError("表名必须以dpdm_,dpdim_,dpdw_,dpmid_,dpods_或dprpt_开头！");
        isOpening = false;
        return;
    }

    var scheduleTime = event.data.scheduleTime;
    if (!scheduleTime) {
        scheduleTime = '';
    }

    if (isEmpty(datasourceName)) {
        alertError('数据源不能为空！');
        isOpening = false;
        return;
    }
    if (isEmpty(databaseName)) {
        alertError('数据库不能为空！');
        isOpening = false;
        return;
    }
    if (isEmpty(tableName)) {
        alertError('表名不能为空！');
        isOpening = false;
        return;
    }

    $.ajax({
        type: 'POST',
        url: Constants.OPEN_TABLE_URL,
        data: {
            datasourceName: encodeURIComponent(datasourceName),
            databaseName: encodeURIComponent(databaseName),
            tableName: encodeURIComponent(tableName),
            scheduleTime: encodeURIComponent(scheduleTime),
            refresh: encodeURIComponent(refresh),
            tabIndex: encodeURIComponent(tabIndex)
        }
    }).done(function(data, textStatus, jqXHR) {
        var tabIndex = data.tabIndex;
        var refresh = data.refresh;
        if (refresh) {
            $('#query-table-widget .widget-toolbar .icon-chevron-up').trigger(ace.click_event);
            $('#main-widget .widget-toolbar .icon-chevron-down').trigger(ace.click_event);
        }

        if (refresh) {
            $('.accordion').accordion({
                active: false,
                disabled: true
            });
        }

        renderDetail(data);
        if (refresh) {
            renderHeader(data);
            renderMeta(data);
            renderCustom(data);
            $('.accordion').accordion({
                active: tabIndex,
                disabled: false
            });
        }
    }).always(function() {
        $('#main-schedule-time-selector').removeAttr('disabled');
        $('#main-contact-list').removeAttr('disabled').trigger('chosen:updated');
        $('#main-run-btn').removeAttr('disabled');
        isOpening = false;
    });
};

// render详情的header部分
var renderHeader = function(data) {
    // 标题
    $('#main-widget h4 small').html(escapeHTML(data.meta.summary.tableName));
    $('#main-table-id').html(data.tableId);

    // 日期控件
    var dt = new Date();
    dt.setTime(dt.getTime() - 1 * 24 * 60 * 60 * 1000);
    $('#main-schedule-time-selector').val(data.scheduleTime ? data.scheduleTime : escapeHTML($.datepicker.formatDate('yy-mm-dd', dt)));

    // 负责人控件
    var $detailHeaderContactList = $('#main-contact-list');
    var contactListArr = data.contactList.split(',');
    $('#main-contact-list-old').val(contactListArr);
    $detailHeaderContactList.val(contactListArr);
    $detailHeaderContactList.trigger('chosen:updated');
};

// render元数据探查
var renderMeta = function(data) {
    $('#main-meta-title').html('元数据探查【最新】'
            + '<small class="margin-10">高优先级<span class="badge badge-danger meta-summary-high">' + escapeHTML(data.meta.priority.high) + '</span></small>'
            + '<small class="margin-10">中优先级<span class="badge badge-warning meta-summary-medium">' + escapeHTML(data.meta.priority.medium) + '</span></small>'
            + '<small class="margin-10">低优先级<span class="badge badge-success meta-summary-low">' + escapeHTML(data.meta.priority.low) + '</span></small>');

    $('#main-ds-name').html(escapeHTML(data.meta.summary.datasourceName));
    $('#main-db-name').html(escapeHTML(data.meta.summary.databaseName));
    $('#main-tbl-name').html(escapeHTML(data.meta.summary.tableName));

    // 显示当前日期
    $('#detail-table-schedule-time').val(data.scheduleTime);

    $('#main-column-cnt-label').html('列数');
    $('#main-partition-label').html('分区键');

    $('#main-column-cnt').html(escapeHTML(data.meta.summary.columnCount));
    if (data.meta.summary.partition) {
        $('#main-partition').html(escapeHTML(data.meta.summary.partition));
    } else {
        $('#main-partition').html(escapeHTML('无'));
    }

    $('#main-meta-other-btn').on(ace.click_event, { hiveMeta: data.meta.hiveMeta }, detailMetaBtnClick);

    if (data.meta.dqList) {
        $.each(data.meta.dqList, function(i, val) {
            var cls;
            if (val.priority == Constants.PRIORITY_UNSET) {
            } else {
                if (val.priority == Constants.PRIORITY_HIGH) {
                    cls = 'badge-danger';
                } else if (val.priority == Constants.PRIORITY_MEDIUM) {
                    cls = 'badge-warning';
                } else if (val.priority == Constants.PRIORITY_LOW) {
                    cls = 'badge-success';
                }
                if (val.ruleType == Constants.COLUMN_CNT_DQ_VAL) {
                    $('#main-column-cnt-label').html('列数&nbsp;<span class="badge ' + cls + '">1</span>');
                } else if (val.ruleType == Constants.PARTITION_DQ_VAL) {
                    $('#main-partition-label').html('分区键&nbsp;<span class="badge ' + cls + '">1</span>');
                }
            }
        });
    }
};

// 查看meta详情
var detailMetaBtnClick = function(event) {
    var hiveMeta = event.data.hiveMeta;
    // TODO
    var hiveMetaStr = '';
    for (var i in hiveMeta) { 
        hiveMetaStr += i + ' : ' + hiveMeta[i] + '<br />';  
    }
    alertInfo(hiveMetaStr);
};

// render详细数据探查
var renderDetail = function(data) {
    $('#main-detail-title').html('详细数据探查' + (data.scheduleTime ? '【' + data.scheduleTime + '】' : '') + '<small class="margin-10">高优先级<span class="badge badge-danger detail-summary-high">'
            + data.detail.priority.high + '</span></small><small class="margin-10">中优先级<span class="badge badge-warning detail-summary-medium">'
            + data.detail.priority.medium + '</span></small><small class="margin-10">低优先级<span class="badge badge-success detail-summary-low">'
            + data.detail.priority.low + '</span></small>');

    $('#main-record-cnt').html(fixed(data.detail.recordCount));
    $('#main-record-cnt-label').html('记录数');
    if (data.detail.dqList) {
        $.each(data.detail.dqList, function(i, val) {
            var cls;
            if (val.priority == Constants.PRIORITY_UNSET) {
            } else {
                if (val.priority == Constants.PRIORITY_HIGH) {
                    cls = 'badge-danger';
                } else if (val.priority == Constants.PRIORITY_MEDIUM) {
                    cls = 'badge-warning';
                } else if (val.priority == Constants.PRIORITY_LOW) {
                    cls = 'badge-success';
                }
                if (val.ruleType == Constants.RECORD_CNT_DQ_VAL) {
                    $('#main-record-cnt-label').html('记录数&nbsp;<span class="badge ' + cls + '">1</span>');
                }
            }
        });
    }

    var columnList = data.detail.columnList;
    var $detailColumnTableTbody = $('#main-detail-table tbody');
    $detailColumnTableTbody.empty();
    $.each(columnList, function(i, val) {
        var ruleType250Result = '';
        if (val.dqList.ruleType250) {
            $.each(val.dqList.ruleType250, function(j, jVal) {
                ruleType250Result += ('探查条件：' + jVal.profileConfig + '，结果：' + (jVal.result ? fixed(parseFloat(jVal.result).toString()) : '空') + '<br />');
            });
        }
        var supportType = [ 'smallint', 'int', 'bigint', 'float', 'double', 'decimal', 'boolean', 'string', 'varchar', 'char' ];
        var isSupportType = false;
        for (var ii = supportType.length - 1; ii >= 0; --ii) {
            if (val.columnType == supportType[ii]) {
                isSupportType = true;
                break;
            }
        }
        var $dqConfigBtn = $('<span class="badge badge-purple dq-config-btn pointer-effect"><i class="icon-pencil bigger-120"></i>&nbsp;配置</span>');
        $dqConfigBtn.on(ace.click_event, { column: val }, dqConfigOpenModal);
        var columnTypeTrim = val.columnType.indexOf('<') >= 0 ? val.columnType.substring(0, val.columnType.indexOf('<')) : val.columnType;
        var ruleType250Css;
        var l250 = 0, m250 = 0, h250 = 0;
        if (val.dqList.ruleType250) {
            $.each(val.dqList.ruleType250, function(j, jVal) {
                if (jVal.priority == 1) ++h250;
                if (jVal.priority == 2) ++m250;
                if (jVal.priority == 3) ++l250;
            });
        }
        if (h250+m250+l250 > 1) ruleType250Css = 'mix-prio-bkgd';
        else if (h250 == 1) ruleType250Css = 'high-prio-bkgd';
        else if (m250 == 1) ruleType250Css = 'medium-prio-bkgd';
        else if (l250 == 1) ruleType250Css = 'low-prio-bkgd';
        else ruleType250Css = 'no-prio-bkgd';
        $detailColumnTableTbody
            .append($('<tr>').attr('class', 'profile-column-' + val.columnId)
                .append($('<td>').html(escapeHTML(val.columnName)
                        + (val.priority.high == 0 ? '' : '&nbsp;<span class="badge badge-danger">' + escapeHTML(val.priority.high) + '</span>')
                        + (val.priority.medium == 0 ? '' : '&nbsp;<span class="badge badge-warning">' + escapeHTML(val.priority.medium) + '</span>')
                        + (val.priority.low == 0 ? '' : '&nbsp;<span class="badge badge-success">' + escapeHTML(val.priority.low) + '</span>')
                        + '<span style="display: none;" class="column-id">' + escapeHTML(val.columnId) + '</span>'))
                .append($('<td>').html(escapeHTML(columnTypeTrim)))
                .append($('<td>').attr('class', getCssByPriority(val.dqList.ruleType200.priority)).html(escapeHTML(fixed(parseFloat(val.dqList.ruleType200.result).toString()))))
                .append($('<td>').attr('class', getCssByPriority(val.dqList.ruleType201.priority)).html(escapeHTML(fixed(parseFloat(val.dqList.ruleType201.result).toString()))))
                .append($('<td>').attr('class', getCssByPriority(val.dqList.ruleType202.priority)).html(escapeHTML(fixed(parseFloat(val.dqList.ruleType202.result).toString()))))
                .append($('<td>').attr('class', getCssByPriority(val.dqList.ruleType203.priority)).html(escapeHTML(fixed(parseFloat(val.dqList.ruleType203.result).toString()))))
                .append($('<td>').attr('class', getCssByPriority(val.dqList.ruleType204.priority)).html(escapeHTML(fixed(parseFloat(val.dqList.ruleType204.result).toString()))))
                .append($('<td>').attr('class', getCssByPriority(val.dqList.ruleType205.priority)).html(escapeHTML(fixed(parseFloat(val.dqList.ruleType205.result).toString()))))
                .append($('<td>').attr('class', getCssByPriority(val.dqList.ruleType206.priority)).html(escapeHTML(fixed(parseFloat(val.dqList.ruleType206.result).toString()))))
                .append($('<td>').attr('hprio', h250).attr('mprio', m250).attr('lprio', l250).attr('class', ruleType250Css).html(isEmpty(ruleType250Result) ? '' : ($('<span class="badge badge-purple pointer-effect"><i class="icon-file-text bigger-120"></i>&nbsp;详情</span>')
                        .attr('data-rel', 'tooltip')
                        .attr('title', ruleType250Result))))
                .append($('<td>').html(isSupportType ? $dqConfigBtn : '')));
    });
};

// render自定义规则
var renderCustom = function(data) {
    $('#main-custom-title').html('自定义规则<small class="margin-10">高优先级<span class="badge badge-danger">'
            + escapeHTML(data.custom.priority.high) + '</span></small><small class="margin-10">中优先级<span class="badge badge-warning">'
            + escapeHTML(data.custom.priority.medium) + '</span></small><small class="margin-10">低优先级<span class="badge badge-success">'
            + escapeHTML(data.custom.priority.low) + '</span></small>');

    var dqList = data.custom.dqList;
    var $detailCustomTableTbody = $('#main-custom-table tbody');
    $detailCustomTableTbody.empty();
    $.each(dqList, function(i, val) {
        $detailCustomTableTbody
            .append($('<tr>')
                .append($('<td>').html(escapeHTML(val.profileConfig)
                        + ( val.priority == Constants.PRIORITY_HIGH ? '&nbsp;<span class="badge badge-danger">1</span>' : (
                            val.priority == Constants.PRIORITY_MEDIUM ? '&nbsp;<span class="badge badge-warning">1</span>' : (
                            val.priority == Constants.PRIORITY_LOW ? '&nbsp;<span class="badge badge-success">1</span>' : '')))))
                .append($('<td>').html(escapeHTML(getRuleName(val.ruleType))))
                .append($('<td>').html(escapeHTML(val.ruleConfig)))
                .append($('<td>').html('<span class="badge badge-purple pointer-effect"><i class="icon-pencil bigger-120"></i></span>'
                        + '&nbsp;<span class="badge badge-danger pointer-effect"><i class="icon-trash bigger-120"></i></span>')));
    });
};

// 日期变化
var detailHeaderScheduleTimeChange = function() {
    var datasourceName = $('#main-ds-name').html();
    var databaseName = $('#main-db-name').html();
    var tableName = $('#main-tbl-name').html();
    var scheduleTime = $(this).val();
    if (scheduleTime == '3000-12-31') {
        alertError('拉链表的探查请选择实际日期！');
        return;
    }
    queryTableOpenBtnClick({
        data: {
            datasourceName: datasourceName,
            databaseName: databaseName,
            tableName: tableName,
            scheduleTime: scheduleTime,
            refresh: false,
            tabIndex: 1
        }
    });
};

// 修改联系人
var detailHeaderContactListChange = function() {
    var tableId = $('#main-table-id').html();
    var contactList = $('#main-contact-list').val();
    if (isEmpty(contactList)) {
        alertError('联系人不能为空！');
        var $detailHeaderContactList = $('#main-contact-list');
        var contactListArr = $('#main-contact-list-old').val().split(',');
        $detailHeaderContactList.val(contactListArr);
        $detailHeaderContactList.trigger('chosen:updated');
        return;
    }
    $.ajax({
        type: 'POST',
        url: Constants.CHANGE_CONTACT_URL,
        data: {
            tableId: encodeURIComponent(tableId),
            contactList: encodeURIComponent(contactList)
        }
    }).done(function(data, textStatus, jqXHR) {
        $('#main-contact-list-old').val($('#main-contact-list').val());
        // do nothing
    });
};

// 执行探查任务
var runProfileBtnClick = function() {
    $('#main-run-btn').attr('disabled', 'disabled');
    var scheduleTime = $('#main-schedule-time-selector').val();
    if (scheduleTime == '3000-12-31') {
        alertError('拉链表的探查请选择实际日期！');
        $('#main-run-btn').removeAttr('disabled');
        return;
    }
    var tableId = $('#main-table-id').html();
    var tableName = $('#main-tbl-name').html();
    if (isEmpty(tableId)) {
        alertError('tableId不能为空！');
        $('#main-run-btn').removeAttr('disabled');
        return;
    }
    if (isEmpty(scheduleTime)) {
        alertError('scheduleTime不能为空！');
        $('#main-run-btn').removeAttr('disabled');
        return;
    }

    $.ajax({
        type: 'POST',
        url: Constants.RUN_PROFILE_URL,
        data: {
            tableId: encodeURIComponent(tableId),
            scheduleTime: encodeURIComponent(scheduleTime)
        }
    }).done(function(data, textStatus, jqXHR) {
        alertInfo('表名：' + tableName + '\n日期：' + scheduleTime + '\n任务' + (data ? '已添加，正等待运行！' : '运行中，请耐心等待！'));
    }).always(function() {
        $('#main-run-btn').removeAttr('disabled');
    });
};

/**
 * 配置DQ
 */
// 配置DQ按钮
var dqConfigOpenModal = function(event) {
    $('#modal-dq-config').modal('show');
    $('#modal-dq-config-finish-btn').removeAttr('disabled');
    $('#modal-dq-config-cancel-btn').hide();

    var dqConfigModalTableTBody = $('#modal-dq-config-table tbody');
    $('#modal-dq-config-title strong').html('{ ' + event.data.column.columnName + ' }');
    $('#modal-dq-config-column-id').html(event.data.column.columnId);
    dqConfigModalTableTBody.empty();

    if (isEmpty(event.data.column.columnId)) {
        alertError('columnId不能为空！');
        return;
    }

    $.ajax({
        type: 'GET',
        url: Constants.GET_RULE_LIST_BY_COLUMN_ID_URL,
        data: {
            columnId: encodeURIComponent(event.data.column.columnId)
        }
    }).done(function(data, textStatus, jqXHR) {
        $.each(data, function(i, val) {
            var obj;
            if (i != 'ruleType250' && i != 'ruleType251') {
                obj = [ val ];
            } else {
                obj = val;
            }
            $.each(obj, function(iInner, valInner) {
                if (valInner.priority != '0') {
                    var $dqEditBtn = $('<span class="badge badge-purple pointer-effect modal-dq-config-edit-dq-btn"><i class="icon-pencil bigger-120" /></span>');
                    var $dqDeleteBtn = $('<span class="badge badge-purple pointer-effect modal-dq-config-delete-dq-btn"><i class="icon-trash bigger-120" /></span>');
                    dqConfigModalTableTBody
                        .append($('<tr>').attr('rule-id', valInner.ruleId).attr('rela-id',  valInner.relatedRuleId)
                            .append($('<td>').attr('value', valInner.priority).html(escapeHTML(getPriorityName(valInner.priority))))
                            .append($('<td>').attr('value', valInner.ruleType).html(escapeHTML(valInner.ruleType != Constants.EXTEND_RULE_DQ_VAL ? getRuleName(valInner.ruleType) : getExtendRuleName(valInner.profileConfig))))
                            .append($('<td>').attr('value', valInner.profileConfig).html(
                                $('<span>').html(
                                    escapeHTML( valInner.ruleType == Constants.EXTEND_RULE_DQ_VAL ? '' : valInner.profileConfig.substring(0, 20) + (valInner.profileConfig.length <= 20 ? '' : '...')))
                                        .attr('data-rel', 'tooltip')
                                        .attr('title', valInner.profileConfig)))
                            .append($('<td>').attr('value', valInner.ruleConfig).html(
                                $('<span>').html(
                                    escapeHTML(valInner.ruleConfig.substring(0, 20) + (valInner.ruleConfig.length <= 20 ? '' : '...')))
                                        .attr('data-rel', 'tooltip')
                                        .attr('title', valInner.ruleConfig)))
                            .append($('<td>').html($('<div>').append($dqEditBtn).append('&nbsp;').append($dqDeleteBtn)))
                        );
                    if (valInner.ruleType != Constants.CUSTOM_PROFILE_DQ_VAL) {
                        $('#modal-dq-config-rule-type option[value=' + valInner.ruleType + ']').attr('hidden', 'hidden');
                    }
                } else {
                    $('#modal-dq-config-rule-type option[value=' + valInner.ruleType + ']').removeAttr('hidden');
                }
                if (valInner.ruleType != Constants.CUSTOM_PROFILE_DQ_VAL && valInner.ruleType != Constants.EXTEND_RULE_DQ_VAL) {
                    $('#modal-dq-config-' + valInner.ruleType).val(valInner.ruleId);
	                var extendRuleOption = $('<option>').val(valInner.ruleId).html(getRuleName(valInner.ruleType));
	                $('#modal-dq-config-related-rule').append(extendRuleOption);
                }
            });
        });
        dqEmpty();
    });
};

// 探查类型change显示/隐藏profile config
var dqConfigModalRuleTypeChange = function(eventObject) {
    if (this.value == Constants.CUSTOM_PROFILE_DQ_VAL) {
        $('#modal-dq-config-profile-config-div').show();
	    $('#modal-dq-config-profile-config-related-rule-div').hide();
        $('#modal-dq-config-profile-config').val('CASE WHEN (  ) THEN (  ) ELSE (  ) END');
        $('#modal-dq-config-profile-config').removeAttr('disabled');
    } else if (this.value == Constants.EXTEND_RULE_DQ_VAL) {
	    $('#modal-dq-config-profile-config-related-rule-div').show();
    } else {
        $('#modal-dq-config-profile-config-div').hide();
	    $('#modal-dq-config-profile-config-related-rule-div').hide();
    }
};
var dqConfigModalRelatedRuleChange = function(eventObject) {
	var option = $(this).find('option:selected');
	if (option.attr('rule-type') == Constants.CUSTOM_PROFILE_DQ_VAL) {
		var sql = option.attr('sql');
	    $('#modal-dq-config-profile-config-div').show();
		$('#modal-dq-config-profile-config').val(sql);
		$('#modal-dq-config-profile-config').attr('disabled', 'disabled');
	} else {
		$('#modal-dq-config-profile-config-div').hide();
	}
};
// 重置dq输入区域
var dqEmpty = function() {
    $('#modal-dq-config-rule-id').val('');
    $('input[name=modal-dq-config-priority]:checked').removeAttr('checked');
    $('#modal-dq-config-rule-type').removeAttr('disabled');
    var ruleTypeDefaultVal = $('#modal-dq-config-rule-type option[hidden!=hidden]:first').val();
    $('#modal-dq-config-rule-type').val(ruleTypeDefaultVal);
    if (ruleTypeDefaultVal == Constants.CUSTOM_PROFILE_DQ_VAL) {
        $('#modal-dq-config-profile-config-div').show();
	    $('#modal-dq-config-profile-config-related-rule-div').hide();
    } else if (ruleTypeDefaultVal == Constants.EXTEND_RULE_DQ_VAL) {
	    $('#modal-dq-config-profile-config-related-rule-div').show();
    }
    else {
        $('#modal-dq-config-profile-config-div').hide();
	    $('#modal-dq-config-profile-config-related-rule-div').hide();
    }
    $('#modal-dq-config-profile-config').val('');
    $('#modal-dq-config-rule-config').val('');
    $('#modal-dq-config-cancel-btn').hide();

	//update @2014.06.07
	//clear extend rule info
	var relatedRules = $('#modal-dq-config-related-rule');
	var extendTypeDefaultVal = $('#modal-dq-config-extend-type option:first').val();
	$('#modal-dq-config-extend-type').val(extendTypeDefaultVal);
	var relatedRuleDefaultVal = $('#modal-dq-config-related-rule option:first').val();
	relatedRules.val(relatedRuleDefaultVal);
	var extendTypeDefaultOptions = $('#modal-dq-config-related-rule option').slice(0, 7);
	relatedRules.empty();
	relatedRules.append(extendTypeDefaultOptions);
	var rulesTr = $('[rule-id]');
	if (rulesTr.size() < 0) {
	} else {
		rulesTr.each(function(i, e){
			var tr = $(e);
			var nameTd = $(tr.children()[1]);
			var sqlTd = $(tr.children()[2]);
			if (nameTd.attr('value') == 250) {
				var option = $('<option>').val(tr.attr('rule-id')).html("自定义探查" );
				option.attr('rule-type', 250);
				option.attr('sql', sqlTd.attr('value'));
				relatedRules.append(option);
			}
		});
	}
	relatedRules.removeAttr('disabled');
	$('#modal-dq-config-extend-type').removeAttr('disabled');
};

// 规则修改按钮
var dqEditBtnClick = function(eventObject) {
    if ($('#modal-dq-config-finish-btn').attr('disabled')) {
        alertError('请等待上一个操作完成！');
        return;
    }
    var $tr = $(this).parents('tr:first');
    var $tds = $tr.children();
	var ruleType = $($tds[1]).attr('value');
    $('#modal-dq-config-rule-id').val($tr.attr('rule-id'));
    $('input[name=modal-dq-config-priority]:checked').removeAttr('checked');
    $('input[name=modal-dq-config-priority][value=' + $($tds[0]).attr('value') + ']').trigger(ace.click_event);
    $('#modal-dq-config-rule-type').attr('disabled', 'disabled');
    $('#modal-dq-config-rule-type').val(ruleType);

    if (ruleType == Constants.CUSTOM_PROFILE_DQ_VAL) {
        $('#modal-dq-config-profile-config-div').show();
	    $('#modal-dq-config-profile-config-related-rule-div').hide();
    } else if (ruleType == Constants.EXTEND_VAL) {
	    $('#modal-dq-config-profile-config-div').hide();
	    //show related rule
	    $('#modal-dq-config-profile-config-related-rule-div').show();
	    $('#modal-dq-config-related-rule').val($tr.attr('rela-id')).attr('disabled', 'disabled');
	    $('#modal-dq-config-extend-type').val($($tds[2]).attr('value')).attr('disabled', 'disabled');
	    //if is 250 then show profile div
    }  else {
        $('#modal-dq-config-profile-config-div').hide();
	    $('#modal-dq-config-profile-config-related-rule-div').hide();
    }
    $('#modal-dq-config-profile-config').val($($tds[2]).attr('value'));
    $('#modal-dq-config-profile-config').attr('disabled', 'disabled');
    $('#modal-dq-config-rule-config').val($($tds[3]).attr('value'));
    $('#modal-dq-config-cancel-btn').show();
};

// 规则修改完成按钮
var dqFinishBtnClick = function(eventObject) {
    $('#modal-dq-config-finish-btn').attr('disabled', 'disabled');

    var columnIdVal = $('#modal-dq-config-column-id').html();
    var tableIdVal = $('#main-table-id').html();
    var ruleIdVal = $('#modal-dq-config-rule-id').val();
    var priorityVal = $('input[name=modal-dq-config-priority]:checked').val();
    var ruleTypeVal = $('#modal-dq-config-rule-type').val();
	var relatedRuleId = $('#modal-dq-config-related-rule').val();
    if (!ruleIdVal) {
        ruleIdVal = $('#modal-dq-config-' + ruleTypeVal).val();
    }
    if (!ruleIdVal) {
        ruleIdVal = "";
    }
    var profileConfigVal = $('#modal-dq-config-profile-config').val();
    var ruleConfigVal = $('#modal-dq-config-rule-config').val();

    if (!priorityVal) {
        alertError('请选择优先级！');
        $('#modal-dq-config-finish-btn').removeAttr('disabled');
        return;
    }
    if (!ruleTypeVal) {
        alertError('请选择探查类型！');
        $('#modal-dq-config-finish-btn').removeAttr('disabled');
        return;
    }
    if (ruleTypeVal == Constants.CUSTOM_PROFILE_DQ_VAL && !profileConfigVal) {
        alertError('请输入探查条件！');
        $('#modal-dq-config-finish-btn').removeAttr('disabled');
        return;
    }
	if (ruleTypeVal >= Constants.EXTEND_VAL && isEmpty(relatedRuleId) ) {
		alertError('请先配置关联规则! ');
		$('#modal-dq-config-finish-btn').removeAttr('disabled');
		return;
	}
    if (!checkExpValid($('#modal-dq-config-rule-config').val())) {
        alertError('取值范围表达式非法！');
        $('#modal-dq-config-finish-btn').removeAttr('disabled');
        return;
    }
	if (ruleTypeVal == Constants.EXTEND_VAL) {
		profileConfigVal = $('#modal-dq-config-extend-type').val();
	}

	if (ruleTypeVal == Constants.CUSTOM_PROFILE_DQ_VAL) {
        alertInfo('正在检查探查条件，需要一定时间，请等待！');
    }

    $.ajax({
        type: 'POST',
        url: Constants.MODIFY_RULE_URL,
        data: {
            ruleId: encodeURIComponent(ruleIdVal),
            tableId: encodeURIComponent(tableIdVal),
            columnId: encodeURIComponent(columnIdVal),
            priority: encodeURIComponent(priorityVal),
            ruleType: encodeURIComponent(ruleTypeVal),
            profileConfig: encodeURIComponent(ruleTypeVal >= Constants.CUSTOM_PROFILE_DQ_VAL ? profileConfigVal : ''),
            ruleConfig: encodeURIComponent(ruleConfigVal),
	        relatedRuleId: encodeURIComponent(ruleTypeVal >= Constants.EXTEND_VAL ? relatedRuleId : ''),
            ruleSQL: ''
        }
    }).done(function(data, textStatus, jqXHR) {
        if (!data.profileConfigCheck) {
            alertError('探查条件配置有误，检测不通过！');
            return;
        }
        updateDetailPriority(data.ruleType, data.diff, data.priority);

        var $dqConfigModalTableTBody = $('#modal-dq-config-table tbody');

        var $dqEditBtn = $('<span class="badge badge-purple pointer-effect modal-dq-config-edit-dq-btn"><i class="icon-pencil bigger-120" /></span>');
        var $dqDeleteBtn = $('<span class="badge badge-purple pointer-effect modal-dq-config-delete-dq-btn"><i class="icon-trash bigger-120" /></span>');

        var isEdit = $('#modal-dq-config-rule-type').attr('disabled');
        if (isEdit) {
            $.each($dqConfigModalTableTBody.children(), function(index, value) {
                var $tr = $(value);
	            var ruleId = $tr.attr('rule-id');
                if (ruleId == data.ruleId) {
	                var $ruleConfigTd = $($tr.children()[3]);
	                $ruleConfigTd.attr('value', ruleConfigVal);
	                $ruleConfigTd.html($('<span>').html(
                            escapeHTML(ruleConfigVal.substring(0, 20) + (ruleConfigVal.length <= 20 ? '' : '...')))
                                .attr('data-rel', 'tooltip')
                                .attr('title', ruleConfigVal));
                    return false;
                }
            });
        } else {
            $dqConfigModalTableTBody
                .append($('<tr>').attr('rule-id', data.ruleId).attr('rela-id',  relatedRuleId)
                    .append($('<td>').attr('value', priorityVal).html(escapeHTML(getPriorityName(priorityVal))))
                    .append($('<td>').attr('value', ruleTypeVal).html(escapeHTML(data.ruleType != Constants.EXTEND_VAL ? getRuleName(data.ruleType) : getExtendRuleName(profileConfigVal))))
                    .append($('<td>').attr('value', profileConfigVal).html(
                        $('<span>').html(
                            escapeHTML(data.ruleType == Constants.EXTEND_VAL ? '' : profileConfigVal.substring(0, 20) + (profileConfigVal.length <= 20 ? '' : '...')))
                                .attr('data-rel', 'tooltip')
                                .attr('title', profileConfigVal)))
                    .append($('<td>').attr('value', ruleConfigVal).html(
                        $('<span>').html(
                            escapeHTML(ruleConfigVal.substring(0, 20) + (ruleConfigVal.length <= 20 ? '' : '...')))
                                .attr('data-rel', 'tooltip')
                                .attr('title', ruleConfigVal)))
                    .append($('<td>').html($('<div>').append($dqEditBtn).append('&nbsp;').append($dqDeleteBtn)))
            );
        }
        if (isEdit) {
            alertInfo('修改成功');
            $('#modal-dq-config-rule-type').removeAttr('disabled');
            $('#modal-dq-config-profile-config').removeAttr('disabled');
	        $('#modal-dq-config-related-rule').removeAttr('disabled');
        } else {
            alertInfo('新增成功');
            if (ruleTypeVal != Constants.CUSTOM_PROFILE_DQ_VAL || ruleTypeVal >= Constants.EXTEND_VAL) {
                $('#modal-dq-config-rule-type option[value=' + ruleTypeVal + ']').attr('hidden', 'hidden');
            }
        }
        dqEmpty();
    }).always(function() {
        $('#modal-dq-config-finish-btn').removeAttr('disabled');
    });
};

// 删除dq
var dqDeleteBtnClick = function(eventObject) {
    if ($('#modal-dq-config-finish-btn').attr('disabled')) {
        alertError('请等待上一个操作完成！');
        return;
    }

    dqEmpty();
    var $currentBtn = $(this);
    var $currentTr = $currentBtn.parents('tr:first');
    var ruleTypeVal = $currentTr.children().first().next().attr('value');
    var profileConfigVal = $currentTr.children().first().next().next().attr('value');

    var ruleIdVal = $currentTr.attr('rule-id');

    if (isEmpty(ruleIdVal)) {
        alertError('ruleId不能为空！');
        return;
    }

    $.ajax({
        type: 'DELETE',
        url: Constants.DELETE_RULE_URL,
        data: {
            ruleId: ruleIdVal
        }
    }).done(function(data, textStatus, jqXHR) {
        $currentBtn.parents('tr:first').remove();
        alertInfo('删除成功');
        $('#modal-dq-config-rule-type option[value=' + ruleTypeVal + ']').removeAttr('hidden');

        updateDetailPriority(ruleTypeVal, data.diff, 0);
    }).always(function() {
        dqEmpty();
    });
};

// 取消dq
var dqCancelBtnClick = function(eventObject) {
    dqEmpty();
    $('#modal-dq-config-cancel-btn').hide();
};

// 更新meta优先级
var updateMetaPriority = function(diff) {
    var sh = parseInt($('.meta-summary-high').html());
    var sm = parseInt($('.meta-summary-medium').html());
    var sl = parseInt($('.meta-summary-low').html());
    sh += diff[0];
    sm += diff[1];
    sl += diff[2];
    $('.meta-summary-high').html(sh);
    $('.meta-summary-medium').html(sm);
    $('.meta-summary-low').html(sl);
};

// 更新detail优先级
var updateDetailPriority = function(ruleType, diff, priority) {
    if (ruleType != Constants.RECORD_CNT_DQ_VAL) {
        var columnIdVal = $('#modal-dq-config-column-id').html();
        var profileColumnTdArr = $('.profile-column-' + columnIdVal).children();
        var $profileColumnTd = $(profileColumnTdArr).first();
        var $hp = $profileColumnTd.find('.badge-danger');
        var $mp = $profileColumnTd.find('.badge-warning');
        var $lp = $profileColumnTd.find('.badge-success');
        var hp, mp, lp;
        hp = $hp.length == 0 ? 0 : parseInt($hp.html());
        mp = $mp.length == 0 ? 0 : parseInt($mp.html());
        lp = $lp.length == 0 ? 0 : parseInt($lp.html());
        hp += diff[0];
        mp += diff[1];
        lp += diff[2];
        var profileColumnTdHtml = $profileColumnTd.html();
        var nbspIdx = profileColumnTdHtml.indexOf('&nbsp;');
        var profileColumnName = nbspIdx == -1 ? profileColumnTdHtml : profileColumnTdHtml.substring(0, nbspIdx);
        $profileColumnTd.html(profileColumnName + 
                (hp == 0 ? '' : '&nbsp;<span class="badge badge-danger">' + hp + '</span>') + 
                (mp == 0 ? '' : '&nbsp;<span class="badge badge-warning">' + mp + '</span>') + 
                (lp == 0 ? '' : '&nbsp;<span class="badge badge-success">' + lp + '</span>'));
        var $td;
        if (ruleType == Constants.NULL_COUNT_DQ_VAL) {
            $td = $(profileColumnTdArr[2]);
        } else if (ruleType == Constants.MIN_VALUE_DQ_VAL) {
            $td = $(profileColumnTdArr[3]);
        } else if (ruleType == Constants.AVG_VALUE_DQ_VAL) {
            $td = $(profileColumnTdArr[4]);
        } else if (ruleType == Constants.MAX_VALUE_DQ_VAL) {
            $td = $(profileColumnTdArr[5]);
        } else if (ruleType == Constants.EMPTY_VALUE_DQ_VAL) {
            $td = $(profileColumnTdArr[6]);
        } else if (ruleType == Constants.SPECIAL_CHAR_DQ_VAL) {
            $td = $(profileColumnTdArr[7]);
        } else if (ruleType == Constants.REPETITION_RATE_DQ_VAL) {
            $td = $(profileColumnTdArr[8]);
        } else if (ruleType == Constants.CUSTOM_PROFILE_DQ_VAL) {
            $td = $(profileColumnTdArr[9]);
        }
        if (ruleType != Constants.CUSTOM_PROFILE_DQ_VAL && ruleType != Constants.EXTEND_VAL) {
            $td.attr('class', getCssByPriority(priority));
        } else if (ruleType == Constants.CUSTOM_PROFILE_DQ_VAL) {
            var h250 = $td.attr('hprio');
            var m250 = $td.attr('mprio');
            var l250 = $td.attr('lprio');
            h250 = parseInt(h250) + diff[0];
            m250 = parseInt(m250) + diff[1];
            l250 = parseInt(l250) + diff[2];
            if (h250+m250+l250 > 1) ruleType250Css = 'mix-prio-bkgd';
            else if (h250 == 1) ruleType250Css = 'high-prio-bkgd';
            else if (m250 == 1) ruleType250Css = 'medium-prio-bkgd';
            else if (l250 == 1) ruleType250Css = 'low-prio-bkgd';
            else ruleType250Css = 'no-prio-bkgd';
            $td.attr('hprio', h250).attr('mprio', m250).attr('lprio', l250).attr('class', ruleType250Css);
        }
    }
    var sh = parseInt($('.detail-summary-high').html());
    var sm = parseInt($('.detail-summary-medium').html());
    var sl = parseInt($('.detail-summary-low').html());
    sh += diff[0];
    sm += diff[1];
    sl += diff[2];
    $('.detail-summary-high').html(sh);
    $('.detail-summary-medium').html(sm);
    $('.detail-summary-low').html(sl);
};

// 检查取值范围表达式
var checkExpValid = function(exp) {
    if (!exp) {
        return false;
    }
    if (/\s/g.test(exp)) {
        return false;
    }
    var type = exp[0];
    switch (type) {
        case '[':
        case '(':
            var arr1 = exp.split('&');
            for (var i = arr1.length - 1; i >= 0; --i) {
                var arr2 = arr1[i].split('|');
                for (var j = arr2.length - 1; j >= 0; --j) {
                    var str = arr2[j];
                    if (str.length <= 3 || (str[0] != '(' && str[0] != '[') || (str[str.length-1] != ')' && str[str.length-1] != ']')) {
                        return false;
                    }
                    var arr3 = str.substring(1,str.length-1).split(',');
                    if (arr3.length != 2 
                            || (arr3[0] == '' && arr3[1] == '') 
                            || (arr3[0] == '' && str[0] != '(') 
                            || (arr3[1] == '' && str[str.length-1] != ')') 
                            || (arr3[0] != '' && isNaN(parseInt(arr3[0]))) 
                            || (arr3[1] != '' && isNaN(parseInt(arr3[1]))) 
                            || (arr3[0] != '' && arr3[1] != '' && parseInt(arr3[0]) > parseInt(arr3[1]))) {
                        return false;
                    }
                }
            }
            break;
        case '{':
            return exp[exp.length - 1] == '}';
        case '!':
            return exp.length >= 3 && exp[1] == '{' && exp[exp.length - 1] == '}';
        default:
            return false;
    }
    return true;
};

// 表级规则修改按钮
var modifyTableDQBtnClick = function(event) {
    var tableId = $('#main-table-id').html();
    var ruleType = event.data.ruleType;

    $('#modal-table-dq-config').modal('show');
    $('#modal-table-dq-config-delete-btn').removeAttr('disabled');
    $('#modal-table-dq-config-finish-btn').removeAttr('disabled');
    $('#modal-table-dq-config-rule-type').val(ruleType);
    $('#modal-table-dq-config-rule-id').val('');
    $('input[name=modal-table-dq-config-priority]:checked').removeAttr('checked');
    $('#modal-table-dq-config-rule-config').val('');

    $.ajax({
        type: 'GET',
        url: Constants.GET_RULE_CFG_URL,
        data: {
            tableId: encodeURIComponent(tableId),
            ruleType: ruleType,
            profileConfig: ''
        }
    }).done(function(data, textStatus, jqXHR) {
        $('#modal-table-dq-config-rule-id').val(data.ruleId);
        $('#modal-table-dq-config-priority-old').val(data.priority);
        // 已配置
        if (data.priority > 0) {
            $('input[name=modal-table-dq-config-priority]').val([data.priority]);
            $('#modal-table-dq-config-rule-config').val(data.ruleConfig);
            $('#modal-table-dq-config-delete-btn').show();
        } else {
            $('#modal-table-dq-config-delete-btn').hide();
            // column count
            if (ruleType == Constants.COLUMN_CNT_DQ_VAL) {
                var html = $('#main-column-cnt').html();
                if (html.indexOf('&nbsp;') >= 0) {
                    html = html.substring(0, html.indexOf('&nbsp;'));
                }
                $('#modal-table-dq-config-rule-config').val('{' + html + '}');
            }
            // partition key
            else if (ruleType == Constants.PARTITION_DQ_VAL) {
                var html = $('#main-partition').html();
                if (html == '无') {
                    html = '';
                }
                if (html.indexOf('&nbsp;') >= 0) {
                    html = html.substring(0, html.indexOf('&nbsp;'));
                }
                $('#modal-table-dq-config-rule-config').val('{' + html + '}');
            }
        }
    });
};

// 表级规则完成按钮
var tableConfigModalFinishBtnClick = function() {
    $('#modal-table-dq-config-delete-btn').attr('disabled', 'disabled');
    $('#modal-table-dq-config-finish-btn').attr('disabled', 'disabled');

    var ruleIdVal = $('#modal-table-dq-config-rule-id').val();
    var priorityVal = $('input[name=modal-table-dq-config-priority]:checked').val();
    var ruleTypeVal = $('#modal-table-dq-config-rule-type').val();
    var ruleConfigVal = $('#modal-table-dq-config-rule-config').val();
    var tableIdVal = $('#main-table-id').html();

    if (isEmpty(ruleIdVal)) {
        alertError('ruleId不能为空！');
        $('#modal-table-dq-config-delete-btn').removeAttr('disabled');
        $('#modal-table-dq-config-finish-btn').removeAttr('disabled');
        return;
    }
    if (isEmpty(tableIdVal)) {
        alertError('tableId不能为空！');
        $('#modal-table-dq-config-delete-btn').removeAttr('disabled');
        $('#modal-table-dq-config-finish-btn').removeAttr('disabled');
        return;
    }
    if (!priorityVal) {
        alertError('请选择优先级！');
        $('#modal-table-dq-config-delete-btn').removeAttr('disabled');
        $('#modal-table-dq-config-finish-btn').removeAttr('disabled');
        return;
    }
    if (!checkExpValid(ruleConfigVal)) {
        alertError('取值范围表达式非法！');
        $('#modal-table-dq-config-delete-btn').removeAttr('disabled');
        $('#modal-table-dq-config-finish-btn').removeAttr('disabled');
        return;
    }

    if (ruleTypeVal == Constants.CUSTOM_PROFILE_DQ_VAL) {
        alertInfo('正在检查探查条件，需要一定时间，请等待！');
    }

    $.ajax({
        type: 'POST',
        url: Constants.MODIFY_RULE_URL,
        data: {
            ruleId: encodeURIComponent(ruleIdVal),
            tableId: encodeURIComponent(tableIdVal),
            columnId: 0,
            priority: encodeURIComponent(priorityVal),
            ruleType: encodeURIComponent(ruleTypeVal),
            profileConfig: '',
            ruleConfig: encodeURIComponent(ruleConfigVal),
            ruleSQL: ''
        }
    }).done(function(data, textStatus, jqXHR) {
        if (!data.profileConfigCheck) {
            alertError('探查条件配置有误，检测不通过！');
            return;
        }
        var oldPrio = $('#modal-table-dq-config-priority-old').val();
        if (oldPrio == 0) {
            alertInfo('新增成功');
        } else {
            alertInfo('修改成功');
        }
        $('#modal-table-dq-config-delete-btn').show();
        $('#modal-table-dq-config-finish-btn').show();
        $('#modal-table-dq-config-priority-old').val(data.priority);

        var ruleTypeVal = data.ruleType;
        if (ruleTypeVal == Constants.RECORD_CNT_DQ_VAL) {
            updateDetailPriority(ruleTypeVal, data.diff, data.priority);
        } else {
            updateMetaPriority(data.diff);
        }
        var cls;
        if (data.diff[0] > 0) {
            cls = 'badge-danger';
        } else if (data.diff[1] > 0) {
            cls = 'badge-warning';
        } else if (data.diff[2] > 0) {
            cls = 'badge-success';
        }
        if (cls) {
            if (ruleTypeVal == Constants.RECORD_CNT_DQ_VAL) {
                $('#main-record-cnt-label').html('记录数&nbsp;<span class="badge ' + cls + '">1</span>');
            } else if (ruleTypeVal == Constants.COLUMN_CNT_DQ_VAL) {
                $('#main-column-cnt-label').html('列数&nbsp;<span class="badge ' + cls + '">1</span>');
            } else if (ruleTypeVal == Constants.PARTITION_DQ_VAL) {
                $('#main-partition-label').html('分区键&nbsp;<span class="badge ' + cls + '">1</span>');
            }
        }
    }).always(function() {
        $('#modal-table-dq-config-delete-btn').removeAttr('disabled');
        $('#modal-table-dq-config-finish-btn').removeAttr('disabled');
    });
};

// 表级规则删除按钮
var tableConfigModalDeleteBtnClick = function() {
    var oldPrio = $('#modal-table-dq-config-priority-old').val();
    if (oldPrio == Constants.PRIORITY_UNSET) {
        alertInfo("规则不存在，无需删除");
        return;
    }

    $('#modal-table-dq-config-delete-btn').attr('disabled', 'disabled');
    $('#modal-table-dq-config-finish-btn').attr('disabled', 'disabled');

    var ruleIdVal = $('#modal-table-dq-config-rule-id').val();
    if (isEmpty(ruleIdVal)) {
        alertError('ruleId不能为空！');
        $('#modal-table-dq-config-delete-btn').removeAttr('disabled');
        $('#modal-table-dq-config-finish-btn').removeAttr('disabled');
        return;
    }

    $.ajax({
        type: 'DELETE',
        url: Constants.DELETE_RULE_URL,
        data: {
            ruleId: encodeURIComponent(ruleIdVal)
        }
    }).done(function(data, textStatus, jqXHR) {
        alertInfo('删除成功');
        $('#modal-table-dq-config-delete-btn').hide();
        var ruleTypeVal = $('#modal-table-dq-config-rule-type').val();
        if (ruleTypeVal == Constants.RECORD_CNT_DQ_VAL) {
            $('#main-record-cnt-label').html('记录数');
        } else if (ruleTypeVal == Constants.COLUMN_CNT_DQ_VAL) {
            $('#main-column-cnt-label').html('列数');
        } else if (ruleTypeVal == Constants.PARTITION_DQ_VAL) {
            $('#main-partition-label').html('分区键');
        }
        $('input[name=modal-table-dq-config-priority]:checked').removeAttr('checked');
        $('#modal-table-dq-config-priority-old').val(Constants.PRIORITY_UNSET);
        if (ruleTypeVal == Constants.RECORD_CNT_DQ_VAL) {
            updateDetailPriority(ruleTypeVal, data.diff, 0);
        } else {
            updateMetaPriority(data.diff);
        }
    }).always(function() {
        $('#modal-table-dq-config-delete-btn').removeAttr('disabled');
        $('#modal-table-dq-config-finish-btn').removeAttr('disabled');
    });
};

// 添加自定义规则
var addCustomRuleBtnClick = function() {
//    $('#modal-custom-sql').modal('show');
    alertInfo('敬请期待');
};

// 根据优先级获取css
var getCssByPriority = function(priority) {
    if (priority == 0) {
        return Constants.NO_PRIO_BKGD;
    } else if (priority == 1) {
        return Constants.HIGH_PRIO_BKGD;
    } else if (priority == 2) {
        return Constants.MEDIUM_PRIO_BKGD;
    } else {
        return Constants.LOW_PRIO_BKGD;
    }
};
