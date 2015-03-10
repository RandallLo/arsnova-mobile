/*
 * This file is part of ARSnova Mobile.
 * Copyright (C) 2011-2012 Christian Thomas Weber
 * Copyright (C) 2012-2015 The ARSnova Team
 * Copyright (C) 2015 Simeon Perlov
 *
 * ARSnova Mobile is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * ARSnova Mobile is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with ARSnova Mobile.  If not, see <http://www.gnu.org/licenses/>.
 */
Ext.define('ARSnova.view.speaker.SortQuestionsPanel', {
	extend: 'Ext.Panel',

	requires: [
		'ARSnova.model.Question',
		'Ext.plugin.SortableList'
	],

	config: {
		title: 'SortQuestionsPanel',
		fullscreen: true,
		scrollable: {
			direction: 'vertical',
			directionLock: true,
			disabled: true
		},

		controller: null
	},

	monitorOrientation: true,

	/* toolbar items */
	toolbar: null,
	backButton: null,
	saveButton: null,

	questions: null,
	
	sortType: 'custom',
	sortTypeBackup: 'custom',

	questionStore: null,
	questionStoreBackup: null,
	questionEntries: [],

	initialize: function () {
		this.callParent(arguments);

		var screenWidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;
		var upperActionButtonCls = screenWidth < 410 ? 'smallerActionButton' : 'actionButton';

		this.questionStore = this.createStore();
		this.questionStoreBackup = this.createStore();

		this.questionList = Ext.create('Ext.List', {
			activeCls: 'search-item-active',
			cls: 'roundedCorners allCapsHeader',

			scrollable: {disabled: false},
			hidden: true,
			infinite: true,
			plugins: {xclass: 'Ext.plugin.SortableList', handleSelector: '.dragStyle'},

			style: {
				backgroundColor: 'transparent',
				height: '660px'
			},


			itemCls: 'forwardListButton',
			itemTpl:
				'<div class="icon-drag thm-grey dragStyle x-list-sortablehandle">&#xf0dc;</div>' +
				'<tpl if="active"><div class="buttontext noOverflow">{text:htmlEncode}</div></tpl>' +
				'<tpl if="!active"><div class="isInactive buttontext noOverflow">{text:htmlEncode}</div></tpl>' +
				'<div class="x-button x-hasbadge audiencePanelListBadge"></div>',
			grouped: true,
			store: this.questionStore,

			listeners: {
				scope: this,
				itemtap: function (list, index, element) {
					this.getController().details({
						question: list.getStore().getAt(index).data
					});

					var sTP = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel;
					var backButton = sTP.questionDetailsPanel.down('button[ui=back]');
					backButton.setHandler(function () {
						var sTP = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel;
						sTP.animateActiveItem(sTP.sortQuestionsPanel, {
							type: 'slide',
							direction: 'right',
							duration: 700
						});
					});
					sTP.questionDetailsPanel.on('deactivate', function (panel) {
						panel.backButton.handler = function () {
							var sTP = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel;
							sTP.animateActiveItem(sTP.audienceQuestionPanel, {
								type: 'slide',
								direction: 'right',
								duration: 700
							});
						};
					}, this, {single: true});
				},
				/**
				 * The following event is used to get the computed height of all list items and
				 * finally to set this value to the list DataView. In order to ensure correct rendering
				 * it is also necessary to get the properties "padding-top" and "padding-bottom" and
				 * add them to the height of the list DataView.
				 */
				painted: function (list, eOpts) {
					var listItemsDom = list.select(".x-list .x-inner .x-inner").elements[0];

					this.questionList.setHeight(
						parseInt(window.getComputedStyle(listItemsDom, "").getPropertyValue("height")) +
						parseInt(window.getComputedStyle(list.dom, "").getPropertyValue("padding-top")) +
						parseInt(window.getComputedStyle(list.dom, "").getPropertyValue("padding-bottom"))
					);
				}
			}
		});

		this.questionListContainer = Ext.create('Ext.form.FieldSet', {
			title: Messages.QUESTION_MANAGEMENT,
			hidden: true,
			items: [this.questionList]
		});

		this.backButton = Ext.create('Ext.Button', {
			text: Messages.BACK,
			ui: 'back',
			handler: function () {
				var sTP = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel;
				sTP.animateActiveItem(sTP.audienceQuestionPanel, {
					type: 'slide',
					direction: 'right',
					duration: 700
				});
			}
		});

		this.saveButtonToolbar = Ext.create('Ext.Button', {
			text: Messages.SAVE,
			ui: 'confirm',
			cls: 'saveQuestionButton',
			style: 'width: 89px',
			handler: function (button) {
				this.saveHandler(button).then(function (response) {
					var panel = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel.sortQuestionsPanel;
					panel.getController().listQuestions();
				});
			},
			scope: this
		});

		this.sortAlphabetButton = Ext.create('ARSnova.view.MatrixButton', {
			text: Messages.SORT_ALPHABET,
			cls: 'actionButton',
			buttonConfig: 'icon',
			imageCls: 'icon-sort-alpha thm-grey',
			handler: this.sortAlphabetHandler
		});
		
		this.sortTimeButton = Ext.create('ARSnova.view.MatrixButton', {
			text: Messages.SORT_TIME,
			cls: 'actionButton',
			buttonConfig: 'icon',
			imageCls: 'icon-sort-time thm-grey',
			handler: this.sortTimeHandler
		});
		
		this.sortRandomButton = Ext.create('ARSnova.view.MatrixButton', {
			text: Messages.SORT_RANDOM,
			cls: 'actionButton',
			buttonConfig: 'icon',
			imageCls: 'icon-sort-random thm-grey',
			handler: this.sortRandomHandler
		});

		this.sortRevertButton = Ext.create('ARSnova.view.MatrixButton', {
			text: Messages.SORT_REVERT,
			cls: 'actionButton',
			buttonConfig: 'icon',
			imageCls: 'icon-undo thm-orange',
			handler: this.sortRevertHandler
		});

		this.actionButtonPanel = Ext.create('Ext.Panel', {
			layout: {
				type: 'hbox',
				pack: 'center'
			},

			style: 'margin: 15px',

			items: [
				this.sortAlphabetButton,
				this.sortTimeButton,
				this.sortRandomButton,
				this.sortRevertButton
			]
		});

		this.toolbar = Ext.create('Ext.Toolbar', {
			title: Messages.QUESTIONS,
			cls: 'speakerTitleText',
			ui: 'light',
			docked: 'top',
			items: [
				this.backButton,
				{xtype: 'spacer'},
				this.saveButtonToolbar
			]
		});

		this.add([
			this.toolbar,
			this.actionButtonPanel, {
				xtype: 'formpanel',
				scrollable: null,
				items: [this.questionListContainer]
			}
		]);

		var me = this;
		this.saveButton = Ext.create('Ext.Button', {
			ui: 'confirm',
			cls: 'saveQuestionButton',
			text: Messages.SORT_SAVE_AND_CONTINUE,
			style: 'margin-top: 70px',
			handler: function (button) {
				me.saveHandler(button).then(function () {
					var theNotificationBox = {};
					theNotificationBox = Ext.create('Ext.Panel', {
						cls: 'notificationBox',
						name: 'notificationBox',
						showAnimation: 'pop',
						modal: true,
						centered: true,
						width: 300,
						styleHtmlContent: true,
						styleHtmlCls: 'notificationBoxText',
						html: Messages.SORT_SAVED
					});
					Ext.Viewport.add(theNotificationBox);
					theNotificationBox.show();

					/* Workaround for Chrome 34+ */
					Ext.defer(function () {
						theNotificationBox.destroy();
					}, 3000);
				}).then(Ext.bind(function (response) {
					me.getScrollable().getScroller().scrollTo(0, 0, true);
				}, me));
			},
			scope: me
		});

		this.add([
			this.saveButton
		]);

		this.on('activate', this.onActivate);
		this.on('deactivate', this.onDeactivate);
		this.on('orientationchange', this.onOrientationChange);
	},
	
	createStore: function () {
		var store = Ext.create('Ext.data.JsonStore', {
			model: 'ARSnova.model.Question',
			sorters: 'text',
			grouper: {
				groupFn: function (record) {
					return Ext.util.Format.htmlEncode(record.get('subject'));
				}
			}
		});
		return store;
	},

	onActivate: function () {
		if (!this.getController()) {
			/*
			 * Somewhere, in ARSnova's endless depths, this method gets called before this panel is ready.
			 * This happens for a returning user who was logged in previously, and is redirected into his session.
			 */
			return;
		}
		this.getController().getSort({
			callbacks: {
				success: Ext.bind(function (response) {
					this.sortType = response.sortType;
					this.sortTypeBackup = response.sortType;
				}, this),
				failure: function (response) {
					console.log('getSortType failed');
				}
			}
		});
		
		this.questionStore.removeAll();
		this.questionStoreBackup.removeAll();
		this.questionEntries = [];

		this.getController().getQuestions(sessionStorage.getItem('keyword'), {
			success: Ext.bind(function (response) {
				var questions = Ext.decode(response.responseText);
				this.questionStore.add(questions);
				this.questionStoreBackup.add(questions);

				this.questionListContainer.show();
				this.questionList.show();
			}, this),
			empty: Ext.bind(function () {
				this.questionListContainer.hide();
				this.questionList.show();
			}, this),
			failure: function (response) {
				console.log('server-side error questionModel.getSkillQuestions');
			}
		});
	},

	onDeactivate: function () {
		this.questionList.hide();
	},

	saveHandler: function (button) {
		var panel = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel.sortQuestionsPanel;
		
		var questionIDs = [];
		panel.questionStore.each(function (record) {
			questionIDs.push(record.getId());
		});
		
		var promise = panel.dispatch(button, panel.sortType, questionIDs);
		return promise;
	},
	sortAlphabetHandler: function (button) {
		var panel = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel.sortQuestionsPanel;
		panel.sortType = 'alphabet';
		panel.questionStore.sort([
			{
				property : 'text',
				direction: 'ASC'
			}
		]);
	},
	sortTimeHandler: function (button) {
		var panel = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel.sortQuestionsPanel;
		panel.sortType = 'time';
		panel.questionStore.sort([
			{
				property : 'timestamp',
				direction: 'DESC'
			}
		]);
	},
	sortRandomHandler: function (button) {
		var panel = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel.sortQuestionsPanel;
		panel.sortType = 'random';
		panel.questionStore.sort([
			{
				property : 'text',
				direction: 'DESC'
			}
		]);
	},
	sortRevertHandler: function (button) {
		var panel = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel.sortQuestionsPanel;
		panel.sortType = panel.sortTypeBackup;
		panel.questionStore.removeAll();
		panel.questionStore.each(function (record) {
			var panel = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel.sortQuestionsPanel;
			panel.questionStore.add(record);
		});
	},
	dispatch: function (button, sortType, questionIDs) {
		button.disable();
		var promise = new RSVP.Promise();
		var panel = ARSnova.app.mainTabPanel.tabPanel.speakerTabPanel.sortQuestionsPanel;
		panel.getController().setSort({
			sortType: sortType,
			questionIDs: questionIDs,
			callbacks: {
				success: function (response, opts) {
					promise.resolve(response);
					button.enable();
				},
				failure: function (response, opts) {
					Ext.Msg.alert(Messages.NOTICE, Messages.SORT_TRANSMISSION_ERROR);
					promise.reject(response);
					button.enable();
				}
			}
		});
		return promise;
	}
});
