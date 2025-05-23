# StarryNight Testing Framework

> **IMPORTANT: Code Migration Notice**
> All implementation code has been moved from `/docs/tester/assets/` to the `/tests/` directory as part of the documentation refactoring plan. This documentation has been updated to reference the new locations, but refers to the same underlying functionality.

Welcome to the StarryNight testing framework! This is your comprehensive guide for validating, testing, and creating test fixtures for PCPIP (Pooled Cell Painting Image Processing) workflows.

## Introduction: Why Validation Matters

StarryNight reimagines the Pooled Cell Painting Image Processing (PCPIP) pipeline with a more maintainable architecture, but we must ensure scientific equivalence with the original implementation. The testing framework outlined here provides a systematic approach to verify that StarryNight produces functionally equivalent results to the reference PCPIP pipeline, giving users confidence in the transition.

**What is validation?** In this context, validation means comparing StarryNight outputs against the original PCPIP implementation at multiple levels:

- Pipeline structure comparison
- Output file verification
- Content similarity analysis
- End-to-end workflow execution

Our validation employs progressive testing of individual components before integration, multiple levels of comparison from pipeline structure to final outputs, tolerance for non-critical numerical differences while ensuring functional equivalence, and documentation-driven development with clear, reproducible testing procedures.

> **Core Principle**: The goal is not byte-for-byte identical outputs, but functionally equivalent results that ensure StarryNight delivers the same scientific value as the original PCPIP implementation.

## Getting Started

This guide serves different types of testers. Find your path based on your role:

### I'm new to StarryNight testing

If you're new to the testing framework and want to understand the process:

1. **Start here**: Read the introduction and [Validation Process Overview](#validation-process-overview) sections to understand the big picture
2. Review the [Validation Documents](#validation-documents) section below to see all the pipelines that need validation
3. Look at the [Pipeline 1 (illum_calc) Validation](validation-pipeline-1-illum-calc.md) as a concrete example with detailed commands
4. See the [Testing Tools Summary](#testing-tools-summary) for an overview of the available tools

### I need to validate a specific pipeline module

If you need to validate a specific StarryNight module:

1. Check the [Validation Documents](#validation-documents) section below to find the corresponding pipeline
2. Follow the 5-stage validation process outlined in the [Validation Stages](#validation-stages) section
3. Use [Pipeline 1 (illum_calc) Validation](validation-pipeline-1-illum-calc.md) as a template

## Reference Materials

The testing framework includes these key resources:

- [**pcpip-pipelines**](https://github.com/broadinstitute/starrynight/tree/main/tests/pcpip-pipelines): Reference CellProfiler pipeline files
- [**pcpip-create-fixture**](https://github.com/broadinstitute/starrynight/tree/main/tests/pcpip-fixtures): Tools for creating test fixtures
- [**pcpip-test**](https://github.com/broadinstitute/starrynight/tree/main/tests/pcpip-validation): Scripts for pipeline execution and comparison

## Testing Environment Setup

Beyond the [standard StarryNight installation](../../user/getting-started.md), validation requires additional setup:

### Prerequisites

- **Nix**: For setting up the complete development environment
    - Follow the [standard StarryNight installation](../../user/getting-started.md)
- **Additional Tools**:
    - **Graphviz**: For pipeline visualization (`apt install graphviz` or `brew install graphviz`)
    - **cp_graph.py**: For CellProfiler pipeline graph analysis (clone from `https://github.com/shntnu/cp_graph`)
- **AWS Access** (optional): For downloading reference datasets
    - AWS CLI configured with access to `s3://imaging-platform/projects/2024_03_12_starrynight/`
-  **Test Data Alternatives** (if no AWS access):
    - Use the minimal test fixtures in `/tests/fixtures/minimal/`

### Test Dataset

Set up the validation dataset:

```sh
# Set up environment
export STARRYNIGHT_REPO="$(git rev-parse --show-toplevel)"
mkdir -p ${STARRYNIGHT_REPO}/scratch

# Download test fixture (if you have AWS access)
aws s3 sync s3://imaging-platform/projects/2024_03_12_starrynight/starrynight_example_input ${STARRYNIGHT_REPO}/scratch/starrynight_example_input

# Create validation workspace
mkdir -p ${STARRYNIGHT_REPO}/scratch/starrynight_example_output/workspace/validation
```

### Common Environment Variables

Use these in all validation scripts:

```sh
# Base directories
export STARRYNIGHT_REPO="$(git rev-parse --show-toplevel)"
export WKDIR="${STARRYNIGHT_REPO}/scratch/starrynight_example_output/workspace"
export VALIDATION_DIR="${WKDIR}/validation"

# Reference locations (common across validations)
export REF_PIPELINES="${STARRYNIGHT_REPO}/tests/pcpip-pipelines"
```

See individual validation documents for pipeline-specific variables.

## Validation Process Overview

The following diagram illustrates the 5-stage validation process and the key tools used at each stage:


```mermaid
flowchart TD
    subgraph Stage1["Stage 1: Topology"]
        RefPipe[Reference Pipeline] -->|cp_graph.py| RefGraph[Reference Graph]
        SNPipe[StarryNight Pipeline] -->|cp_graph.py| SNGraph[StarryNight Graph]
        RefGraph -->|diff| GraphComp
        SNGraph -->|diff| GraphComp
        GraphComp[Graph Comparison]
    end

    subgraph Stage2["Stage 2: LoadData"]
        RefLD[Reference LoadData] -->|diff| LDComp
        SNLD[StarryNight LoadData] -->|diff| LDComp
        LDComp[LoadData Comparison]
    end

    subgraph Stage3["Stage 3: Reference Run"]
        RefPipeExec[Reference Pipeline] -->|run_pcpip.sh| RefOut
        RefOut -->|verify_file_structure.py| RefStruct
        RefOut[Reference Output]
        RefStruct[Reference Structure]
    end

    subgraph Stage4["Stage 4: StarryNight by hand"]
        SNPipeExec[StarryNight Pipeline] -->|run_pcpip.sh| SN1Out
        SN1Out -->|verify_file_structure.py| SN1Struct
        SN1Out[StarryNight Output]
        SN1Struct[StarryNight Structure]

        SN1Out -->|diff| RefSN1Comp
        Ref1Struct -->|diff| RefSN1Comp

        RefSN1Comp[Output Comparison]
        Ref1Struct[Reference Structure]
    end

    subgraph Stage5["Stage 5: StarryNight End-to-End"]
        SNCLI[StarryNight CLI] -->|starrynight commands| SN2Out
        SN2Out -->|verify_file_structure.py| SN2Struct
        SN2Out[End-to-End Output]
        SN2Struct[E2E Structure]

        SN2Out -->|diff| RefSN2Comp
        Ref2Struct -->|diff| RefSN2Comp

        RefSN2Comp[Output Comparison]
        Ref2Struct[Reference Structure]

    end

    Stage1 --> Stage2 --> Stage3
    Stage3 --> Stage4
    Stage3 --> Stage5
```

## Validation Stages

### Stage 1: Pipeline Graph Topology Validation
- **Objective**: Verify that StarryNight pipelines have identical module dependency graphs compared to PCPIP
- **Approach**:
    - Use `cp_graph.py` to convert CellProfiler pipeline JSONs to DOT graph files
    - Compare generated DOT files against reference graphs in `_ref_graph_format/dot`
    - Validate module connections, data flow, and overall structure
- **Success Criteria**: Graph structural equivalence without requiring identical module settings

### Stage 2: LoadData CSV Generation Validation
- **Objective**: Ensure StarryNight generates compatible LoadData CSV files
- **Approach**:
    - Generate LoadData CSVs using StarryNight
    - Compare against reference LoadData CSVs using `compare_structures.py`
    - Validate CSV structure, headers, and key metadata fields
- **Success Criteria**: Functionally equivalent CSV files (allowing for formatting differences)

#### CSV Validation Philosophy
The validation of LoadData CSVs is intentionally nuanced rather than a simple binary comparison. While a direct dataframe diff would be simplest, it would flag many acceptable differences that don't impact scientific validity. Our validation approach:

1. **Beyond Binary Comparison**: Rather than just determining whether files are identical, the validation identifies and classifies the types of differences
2. **Forensic Analysis**: The validation acts as a forensic tool to explain differences, answering "what kind of difference is this?" rather than just "is there a difference?"
3. **Acceptable Variations**: Certain differences (ordering, floating point precision, etc.) are expected and acceptable
4. **Critical vs. Non-Critical**: The validation distinguishes between differences that impact scientific results and those that don't

This approach is essential for scientific pipelines where small variations in output might be acceptable due to factors such as:
- Different ordering of otherwise identical data
- Minor floating point precision differences
- Alternative but equivalent path representations
- Metadata differences that don't affect processing

### Stage 3: Reference Pipeline Execution
- **Objective**: Run reference pipelines with reference LoadData and capture outputs
- **Approach**:
    - Execute reference CellProfiler pipelines using command-line invocation
    - Use `run_pcpip.sh` script to orchestrate multi-stage pipeline execution
    - Capture all outputs and file structures
- **Success Criteria**: Successful execution of all pipeline stages with expected outputs

### Stage 4: StarryNight Pipeline Execution
- **Objective**: Run StarryNight-generated pipelines with reference LoadData
- **Approach**:
    - Execute StarryNight-generated CellProfiler pipelines with identical inputs
    - Compare outputs against reference using `verify_file_structure.py` and `compare_structures.py`
    - Iterate on pipelines until outputs match
- **Success Criteria**: Outputs that match reference results (allowing for numerical differences)

### Stage 5: StarryNight End-to-End Testing
- **Objective**: Validate complete StarryNight workflow including orchestration
- **Approach**:
    - Execute StarryNight's CellProfiler invocation with StarryNight-generated LoadData
    - Compare against reference outputs
    - Iterate on orchestration system until outputs match
- **Success Criteria**: End-to-end process produces equivalent results to reference

## Validation Documents

Currently, a validation document has been created only for [Pipeline 1: illum_calc](validation-pipeline-1-illum-calc.md). To create validation documents for other pipelines, use this as a template and adjust the pipeline-specific details accordingly.

Here are the reference CellProfiler pipelines and their StarryNight module counterparts:

- `ref_1_CP_Illum.cppipe`: `illum_calc`
- `ref_2_CP_Apply_Illum.cppipe`: `illum_apply`
- `ref_3_CP_SegmentationCheck.cppipe`: `segcheck`
- `ref_5_BC_Illum.cppipe`:  `illum_calc`
- `ref_6_BC_Apply_Illum.cppipe`: `illum_apply_sbs`
- `ref_7_BC_Preprocess.cppipe`: `preprocess`
- `ref_9_Analysis.cppipe`: `analysis`

## Validation Strategy and Success Criteria

To ensure StarryNight can confidently replace the original PCPIP implementation, our validation approach:

- **Tracks progress** through GitHub issues (one per pipeline) linked to detailed documentation, where issues serve as discussion forums while validation documents contain the actual technical details and results
- **Uses a balanced test fixture** from `/tests/pcpip-fixtures` that's small yet representative
- **Defines success** through:
    - Structural equivalence: Identical data flow between modules
    - Functional equivalence: Comparable outputs (with acceptable numerical differences)
    - Reproducibility: Consistent results across executions
    - Traceability: Clear documentation of validation results

The goal isn't byte-for-byte identical outputs, but functionally equivalent results that deliver the same scientific value with improved maintainability and extensibility.

> **Testing Framework Roadmap**: `compare_structures.py` should be modified to allow direct comparison of LoadData CSVs and specify exact files to compare, `run_pcpip.sh` should be updated to accept the output base path as a parameter and pipeline paths as parameters or standardize locations of StarryNight pipelines for symmetry.

## Testing Tools Summary

The validation process uses these key tools:

| Tool                         | Purpose                                            | Source                                                                                                      | Used In    |
| ---------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| **cp_graph.py**              | Creates graph visualizations of pipeline structure | [External repo](https://github.com/shntnu/cp_graph)                                                         | Stage 1    |
| **verify_file_structure.py** | Validates output file existence and structure      | [tests/tools](https://github.com/broadinstitute/starrynight/tree/main/tests/tools/verify_file_structure.py) | Stages 3-5 |
| **compare_structures.py**    | Compares output structures for differences         | [tests/tools](https://github.com/broadinstitute/starrynight/tree/main/tests/tools/compare_structures.py)    | Stages 4-5 |
| **run_pcpip.sh**             | Executes CellProfiler pipeline workflows           | [tests/tools](https://github.com/broadinstitute/starrynight/tree/main/tests/tools/run_pcpip.sh)             | Stage 3-4  |
