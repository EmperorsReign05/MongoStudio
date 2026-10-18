import * as Blockly from 'blockly/core';

const collectionOptions: [string, string][] = [['students', 'students'], ['products', 'products'], ['orders', 'orders'], ['sandbox', 'sandbox']];
const filterOperators: [string, string][] = [['equals', '$eq'], ['greater than', '$gt'], ['at least', '$gte'], ['less than', '$lt'], ['at most', '$lte'], ['not equal', '$ne'], ['in list', '$in'], ['not in list', '$nin'], ['exists', '$exists'], ['matches pattern', '$regex']];

export function defineBlocks(): void {
  if (Blockly.Blocks.db_root) return;

  Blockly.Blocks.db_root = { init() { this.appendDummyInput().appendField('db'); this.setNextStatement(true, 'Collection'); this.setColour('#5970b5'); this.setTooltip('Start a MongoDB query.'); } };
  Blockly.Blocks.collection = { init() { this.appendDummyInput().appendField('.').appendField(new Blockly.FieldDropdown(collectionOptions), 'COLLECTION_NAME'); this.setPreviousStatement(true, 'Collection'); this.setNextStatement(true, 'Operation'); this.setColour('#7560ad'); this.setTooltip('Choose a demonstration collection.'); } };

  createMethod('method_find', '.find filters', 'FILTER', 'Filter', 'OPTIONS', 'Option');
  createMethod('method_aggregate', '.aggregate pipeline', 'STAGES', 'PipelineStage');
  createMethod('method_insert', '.insertOne document', 'FIELDS', 'DocumentField');
  createMethod('method_update', '.updateMany filters', 'FILTER', 'Filter', 'UPDATES', 'UpdateField');
  createMethod('method_delete', '.deleteMany filters', 'FILTER', 'Filter');

  Blockly.Blocks.filter_condition = { init() {
    this.appendDummyInput().appendField('where').appendField(new Blockly.FieldTextInput('age'), 'FIELD').appendField(new Blockly.FieldDropdown(filterOperators), 'OPERATOR').appendField(new Blockly.FieldTextInput('20'), 'VALUE');
    this.setPreviousStatement(true, 'Filter'); this.setNextStatement(true, 'Filter'); this.setColour('#55a968'); this.setTooltip('Compare a field with a typed value. Use commas for an in-list value.');
  } };
  Blockly.Blocks.filter_logic = { init() {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['all of (AND)', '$and'], ['any of (OR)', '$or'], ['not', '$not']]), 'OPERATOR');
    this.appendStatementInput('CONDITIONS').setCheck('Filter').appendField('conditions');
    this.setPreviousStatement(true, 'Filter'); this.setNextStatement(true, 'Filter'); this.setColour('#8a63b8'); this.setTooltip('Nest conditions to express MongoDB logical operators.');
  } };

  Blockly.Blocks.find_option = { init() {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['sort', 'sort'], ['project field', 'project'], ['limit', 'limit'], ['skip', 'skip']]), 'TYPE').appendField(new Blockly.FieldTextInput('gpa'), 'FIELD').appendField(new Blockly.FieldDropdown([['ascending', '1'], ['descending', '-1']]), 'DIRECTION');
    this.setPreviousStatement(true, 'Option'); this.setNextStatement(true, 'Option'); this.setColour('#d59a4b'); this.setTooltip('Add sorting, projection, limit, or skip to find.');
  } };

  Blockly.Blocks.stage_match = { init() { this.appendStatementInput('FILTER').setCheck('Filter').appendField('$match'); this.setPreviousStatement(true, 'PipelineStage'); this.setNextStatement(true, 'PipelineStage'); this.setColour('#55a968'); } };
  Blockly.Blocks.stage_project = { init() { this.appendStatementInput('FIELDS').setCheck('ProjectField').appendField('$project fields'); this.setPreviousStatement(true, 'PipelineStage'); this.setNextStatement(true, 'PipelineStage'); this.setColour('#d59a4b'); } };
  Blockly.Blocks.project_field = { init() { this.appendDummyInput().appendField(new Blockly.FieldTextInput('name'), 'FIELD').appendField(new Blockly.FieldDropdown([['include', '1'], ['exclude', '0']]), 'INCLUDE'); this.setPreviousStatement(true, 'ProjectField'); this.setNextStatement(true, 'ProjectField'); this.setColour('#d59a4b'); } };
  Blockly.Blocks.stage_group = { init() { this.appendDummyInput().appendField('$group by').appendField(new Blockly.FieldTextInput('category'), 'ID_FIELD'); this.appendStatementInput('ACCUMULATORS').setCheck('Accumulator').appendField('calculations'); this.setPreviousStatement(true, 'PipelineStage'); this.setNextStatement(true, 'PipelineStage'); this.setColour('#c27b52'); } };
  Blockly.Blocks.accumulator = { init() { this.appendDummyInput().appendField(new Blockly.FieldTextInput('total'), 'NAME').appendField(new Blockly.FieldDropdown([['sum', '$sum'], ['average', '$avg'], ['minimum', '$min'], ['maximum', '$max'], ['collect', '$push']]), 'OPERATOR').appendField(new Blockly.FieldTextInput('price'), 'FIELD'); this.setPreviousStatement(true, 'Accumulator'); this.setNextStatement(true, 'Accumulator'); this.setColour('#c27b52'); } };
  createSimpleStage('stage_sort', '$sort', 'FIELD', 'price', 'DIRECTION', [['ascending', '1'], ['descending', '-1']]);
  createSimpleStage('stage_limit', '$limit', 'VALUE', '10');
  createSimpleStage('stage_skip', '$skip', 'VALUE', '0');
  createSimpleStage('stage_unwind', '$unwind array', 'VALUE', 'items');
  createSimpleStage('stage_count', '$count as', 'VALUE', 'total');
  Blockly.Blocks.stage_add_fields = { init() {
    this.appendDummyInput().appendField('$addFields').appendField(new Blockly.FieldTextInput('label'), 'FIELD').appendField('=').appendField(new Blockly.FieldTextInput('example'), 'VALUE');
    this.setPreviousStatement(true, 'PipelineStage'); this.setNextStatement(true, 'PipelineStage'); this.setColour('#d59a4b');
  } };

  Blockly.Blocks.document_field = { init() { this.appendDummyInput().appendField('field').appendField(new Blockly.FieldTextInput('title'), 'FIELD').appendField('value').appendField(new Blockly.FieldTextInput('Example'), 'VALUE'); this.setPreviousStatement(true, 'DocumentField'); this.setNextStatement(true, 'DocumentField'); this.setColour('#449c9e'); } };
  Blockly.Blocks.update_field = { init() { this.appendDummyInput().appendField(new Blockly.FieldDropdown([['set', '$set'], ['increase', '$inc'], ['add to array', '$push'], ['remove', '$unset']]), 'OPERATOR').appendField(new Blockly.FieldTextInput('status'), 'FIELD').appendField(new Blockly.FieldTextInput('updated'), 'VALUE'); this.setPreviousStatement(true, 'UpdateField'); this.setNextStatement(true, 'UpdateField'); this.setColour('#d06b78'); } };
}

function createMethod(type: string, label: string, firstInput: string, firstCheck: string, secondInput?: string, secondCheck?: string): void {
  Blockly.Blocks[type] = { init() {
    this.appendDummyInput().appendField(label);
    this.appendStatementInput(firstInput).setCheck(firstCheck).appendField(firstInput === 'FILTER' ? 'filters' : '');
    if (secondInput && secondCheck) this.appendStatementInput(secondInput).setCheck(secondCheck).appendField(secondInput === 'STAGES' ? 'stages' : secondInput === 'UPDATES' ? 'updates' : '');
    this.setPreviousStatement(true, 'Operation'); this.setColour('#b05c73');
  } };
}

function createSimpleStage(type: string, label: string, firstName: string, firstValue: string, secondName?: string, secondOptions?: [string, string][]): void {
  Blockly.Blocks[type] = { init() {
    this.appendDummyInput().appendField(label).appendField(new Blockly.FieldTextInput(firstValue), firstName);
    if (secondName && secondOptions) this.appendDummyInput().appendField(new Blockly.FieldDropdown(secondOptions), secondName);
    this.setPreviousStatement(true, 'PipelineStage'); this.setNextStatement(true, 'PipelineStage'); this.setColour('#d59a4b');
  } };
}
