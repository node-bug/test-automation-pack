const testrailapi = require('./testrailapi');
const jsonfile = require('jsonfile');

const that = {};

function cucumberToTestRail() {
  const my = {};
  my.path = `${process.cwd()}/reports/cucumber_report.json`;
  my.readJson = async (path) => jsonfile.readFileSync((path || my.path));
  
  my.parse = async (path) => {
    const content = new Map();
    const report = await my.readJson(path);
    await report.forEach((feature) => {
      const [, project] = feature.uri.split('/');

      if (!content.has(project)) {
        content.set(project, new Map());
      }

      const section = feature.name;
      if (!content.get(project).has(section)) {
        (content.get(project)).set(section, new Map());
      }

      feature.elements.forEach((scenario) => {
        if (!content.get(project).get(section).has(scenario.name)) {
          content.get(project).get(section).set(scenario.name, new Map());
        }
        const caseContent = {
          type_id: 1,
          priority_id: 5,
          estimate: '20m',
          custom_steps_separated: [],
        };
        const resultContent = {
          status_id: 12,
          comment: 'This test was not executed',
          elapsed: '',
          custom_step_results: [],
        };
        caseContent.title = scenario.name;
        const steps = caseContent.custom_steps_separated;
        const logs = resultContent.custom_step_results;
        for (let i = 0; i < scenario.steps.length; i += 1) {
          if (scenario.steps[i].keyword !== 'After' && scenario.steps[i].keyword !== 'Before') {
            steps[i] = {};
            steps[i].content = scenario.steps[i].keyword + scenario.steps[i].name.replace(/"/g, '');
            // steps[i].expected = 'Expected Result to be updated.';

            let stepResult = scenario.steps[i].result.status;
            if (stepResult === 'passed') {
              stepResult = 1;
              resultContent.status_id = 1;
              resultContent.comment = 'This test passed.';
            } else if (stepResult === 'failed') {
              stepResult = 5;
              resultContent.status_id = 5;
              resultContent.comment = 'This test failed.';
            } else if (stepResult === 'skipped'){
              stepResult = 12;
            }

            logs[i] = {};
            logs[i].content = scenario.steps[i].keyword + scenario.steps[i].name.replace(/"/g, '');
            // logs[i].expected = 'Expected Result to be updated.';
            logs[i].actual = scenario.steps[i].result.status;
            logs[i].status_id = stepResult;

            // const duration = parseInt(scenario.steps[i].result.duration);
            // if (duration !== undefined) {
            //   resultContent.elapsed += duration;
            // }
          }
        }
        content.get(project).get(section).get(scenario.name).set('caseContent', caseContent);
        content.get(project).get(section).get(scenario.name).set('resultContent', resultContent);
      });
    });
    return content;
  };

  that.uploadCases = async (user, path, suiteName) => {
    const content = await my.parse(path);
    const tr = testrailapi.testRail();
    await tr.setConnection(user);

    for(const [project, sections] of content.entries()){
      const projectId = (await tr.getProjectByName(project)).id;
      const suiteId = (await tr.addSuite(projectId, suiteName)).id;
      for(const [section, cases] of sections.entries()){
        const sectionId = (await tr.addSection(projectId, suiteId, section)).id;
        for(const [scenario, data] of cases){
          tr.addCase(projectId, suiteId, sectionId, data.get('caseContent'));
        }
      }
    }
  }

  that.uploadResults = async (user, path, suiteName, runName) => {
    const content = await my.parse(path);
    const tr = testrailapi.testRail();
    await tr.setConnection(user);

    for(const [project, sections] of content.entries()){
      const projectId = (await tr.getProjectByName(project)).id;
      const suiteId = (await tr.addSuite(projectId, suiteName)).id;
      await tr.addTestRun(projectId, suiteId, runName);
      const runId = (await tr.getTestRunByName(projectId, runName)).id;
      for(const [section, cases] of sections.entries()){
        const sectionId = (await tr.addSection(projectId, suiteId, section)).id;
        for(const [scenario, data] of cases){
          const caseTitle = (await tr.getCaseByName(projectId, suiteId, sectionId, scenario)).title;
          const testId = (await tr.getTestByName(runId, caseTitle)).id;
          tr.addResult(testId, data.get('resultContent'));
        }
      }
    }
  };

  return that;
};

module.exports = {
  cucumberToTestRail
}
