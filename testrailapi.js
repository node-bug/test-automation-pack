const TestRailAPI = require('testrail-api');

const that = {};

function testRail() {
  const my = {};
  my.connection = null;

  that.setConnection = async function (user) {
    my.connection = new TestRailAPI(user);
  };

  that.getProjectByName = async (projectName) => (await my.connection.getProjects()).body.filter(project => project.name === projectName)[0];

  // Test Suites and Cases
  // Takes in a project id and a name of the suite.
  // Returns the first instance of the suite.
  that.getSuiteByName = async (projectId, suiteName) => (await my.connection.getSuites(projectId)).body.filter(suite => suite.name === suiteName)[0];

  // Takes in a project id, suite id, and a name of the section.
  // Returns the first instance of the section.
  that.getSectionByName = async (projectId, suiteId, sectionName) => (await my.connection.getSections(projectId, { suite_id: suiteId })).body.filter(section => section.name === sectionName)[0];

  // Takes in a project id, suite id, section id, and the name of the case.
  // Returns the first instance of the case.
  that.getCaseByName = async (projectId, suiteId, sectionId, caseName) => (await my.connection.getCases(projectId, {suite_id: suiteId,section_id: sectionId})).body.filter(myCase => myCase.title === caseName)[0];

  // Put Functions
  // Takes in the project id and the suite name.  Checks to see if the suite exist.
  // If not, adds the suite to the given project.
  that.addSuite = async (projectId, suiteName) => {
    const suite = await that.getSuiteByName(projectId, suiteName);
    if (suite === undefined) {
      await my.connection.addSuite(projectId, { name: suiteName });
    }
    return that.getSuiteByName(projectId, suiteName);
  };

  // Takes in the project id, suite id, and the section name.  Adds the section to the given suite.
  that.addSection = async (projectId, suiteId, sectionName) => {
    const section = await that.getSectionByName(projectId, suiteId, sectionName);
    if (section === undefined) {
      await my.connection.addSection(projectId, { suite_id: suiteId, name: sectionName });
    }
    return that.getSectionByName(projectId, suiteId, sectionName);
  };

  that.addCase = async (projectId, suiteId, sectionId, content) => {
    const Case = await that.getCaseByName(projectId, suiteId, sectionId, content.title);
    if (Case === undefined) {
      await my.connection.addCase(sectionId, content);
    }
  };

  // //Test Runs and Results
  // Takes in a project id and a name of the run.  Returns the first instance of the run.
  that.getTestRunByName = async (projectId, runName) => (await my.connection.getRuns(projectId)).body.filter(run => run.name === runName)[0];

  // Takes in a plan id and the name of the case.  Returns the first instance of the test run.
  that.getTestByName = async (runId, caseName) => (await my.connection.getTests(runId, {})).body.filter(test => test.title === caseName)[0];

  that.addTestRun = async (projectId, suiteId, runName) => {
    const run = await that.getTestRunByName(projectId, runName);
    if (run === undefined) {
      await my.connection.addRun(projectId, {suite_id: suiteId, name: runName, include_all: true});
    }
  };

  that.addResult = async (testId, content) => my.connection.addResult(testId, content);

  return that;
}

module.exports = {
  testRail,
};
