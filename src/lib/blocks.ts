import * as Blockly from 'blockly/core';
import 'blockly/blocks';

export const defineBlocks = () => {
  Blockly.defineBlocksWithJsonArray([
    {
      "type": "db_root",
      "message0": "db",
      "nextStatement": "Collection",
      "colour": 230,
      "tooltip": "The database root object",
      "helpUrl": ""
    },
    {
      "type": "collection",
      "message0": ".%1",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "COLLECTION_NAME",
          "options": [
            ["students", "students"],
            ["movies", "movies"]
          ]
        }
      ],
      "previousStatement": "Collection",
      "nextStatement": "Method",
      "colour": 260,
      "tooltip": "Select a collection",
      "helpUrl": ""
    },
    {
      "type": "method_find",
      "message0": ".find( %1 %2 )",
      "args0": [
        {
          "type": "input_dummy"
        },
        {
          "type": "input_statement",
          "name": "FILTER",
          "check": "Filter"
        }
      ],
      "previousStatement": "Method",
      "colour": 345,
      "tooltip": "Find documents matching a filter",
      "helpUrl": ""
    },
    {
      "type": "match_filter",
      "message0": "Match: %1 %2 %3",
      "args0": [
        {
          "type": "field_input",
          "name": "FIELD",
          "text": "age"
        },
        {
          "type": "field_dropdown",
          "name": "OPERATOR",
          "options": [
            ["=", "$eq"],
            [">", "$gt"],
            ["<", "$lt"],
            [">=", "$gte"],
            ["<=", "$lte"],
            ["!=", "$ne"]
          ]
        },
        {
          "type": "field_input",
          "name": "VALUE",
          "text": "20"
        }
      ],
      "previousStatement": "Filter",
      "nextStatement": "Filter",
      "colour": 120,
      "tooltip": "Filter documents",
      "helpUrl": ""
    },
    {
      "type": "logic_branch",
      "message0": "%1 %2 %3",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "OPERATOR",
          "options": [
            ["$or", "$or"],
            ["$and", "$and"]
          ]
        },
        {
          "type": "input_dummy"
        },
        {
          "type": "input_statement",
          "name": "CONDITIONS",
          "check": "Filter"
        }
      ],
      "previousStatement": "Filter",
      "nextStatement": "Filter",
      "colour": 290,
      "tooltip": "Logical branching for multiple conditions",
      "helpUrl": ""
    }
  ]);
};


