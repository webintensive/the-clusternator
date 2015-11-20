'use strict';
var constants = require('../constants'),
  Q = require('q');

/**
 * @param {string} pid
 * @param {string} pr
 * @param {string} id
 * @param {string} label
 * @throws {Error}
 */
function throwInvalidPidPrTag(pid, pr, id, label) {
  throw new Error('No Clusternator Tagged ' + label + ' Available For ' +
    'Destruction With ' + label + ' For Project: ' + pid + ' Id: ' + id +
    ' PR: ' + pr);
}

/**
 * @param {string} pid
 * @param {string} deployment
 * @param {string} id
 * @param {string} label
 * @throws {Error}
 */
function throwInvalidPidDeploymentTag(pid, deployment, id, label) {
  throw new Error('No Clusternator Tagged ' + label + ' Available For ' +
    'Destruction With ' + label + ' For Project: ' + pid + ' Id: ' + id +
    ' Deployment: ' + deployment);
}

/**
 * @param {string} pid
 * @param {string} id
 * @param {string} label
 * @throws {Error}
 */
function throwInvalidPidTag(pid, id, label) {
  throw new Error('No Clusternator Tagged ' + label + ' Available For ' +
    'Destruction With ' + label + ' For Project: ' + pid + ' Id: ' + id);
}

/**
@param {string} pid
@param {Tag[]} collection
*/
function areTagsPidValid(pid, collection) {
  var isValid = false;
  collection.forEach((tag) => {
    if (tag.Key !== constants.PROJECT_TAG) {
      return;
    }
    if (tag.Value === pid) {
      isValid = true;
    }
  });
  return isValid;
}

/**
@param {string} pid project identifier
@param {string} pr pull request #
@param {Tags[]} collection to search
@return {boolean}
*/
function areTagsPidPrValid(pid, pr, collection) {
  var isValidPid = false,
    isValidPr = false;

  collection.forEach((tag) => {
    if (tag.Key === constants.PROJECT_TAG) {
      if (tag.Value === pid) {
        isValidPid = true;
      }
    }
    if (tag.Key === constants.PR_TAG) {
      if (tag.Value === pr) {
        isValidPr = true;
      }
    }
  });

  return isValidPid && isValidPr;
}

/**
@param {string} key
@param {*} value
@return {AWSFilter}
*/
function makeAWSFilter(key, value) {
  if (!Array.isArray(value)) {
    value = [value];
  }
  return [{
    Name: key,
    Values: value
  }];
}

/**
@param {string} value
@return {AWSFilter}
*/
function makeAWSVPCFilter(value) {
  return makeAWSFilter('vpc-id', value);
}

/**
@param {string} key
@param {*} value
@return {AWSFilter}
*/
function makeAWSTagFilter(key, value) {
  return makeAWSFilter('tag:' + key, value);

}

/**
@param {EC2} ec2
@param {string[]|string} resourceIds
@param {Tags[]} tags
*/
function awsTagEc2(ec2, resourceIds, tags) {
  if (!Array.isArray(resourceIds)) {
    resourceIds = [resourceIds];
  }
  return ec2.createTags({
    Resources: resourceIds,
    Tags: tags
  });
}

/**
@param {EC2} ec2
@param {string} apiFn name of the ec2 api function to call
@param {string} apiListName name of the description list in the result
@param {Filter[]} baseFilters
@return function(...)
*/
function makeEc2DescribeFn(ec2, apiFn, apiListName, baseFilters) {
  /**
  @param {AwsFilter[]|AwsFilter} filters
  @return {Q.Promise}
  */
  function describe(filters) {
    if (!Array.isArray(filters)) {
      if (filters) {
        filters = [filters];
      } else {
        filters = [];
      }
    }
    return ec2[apiFn]({
      DryRun: false,
      Filters: baseFilters.concat(filters)
    }).then((result) => {
      // this case happens when describing ec2 instances
      if (!result[apiListName]) {
        return [];
      }
      // normal case
      return result[apiListName];
    });

  }
  return describe;
}

/**
 * @param {function(...):Q.Promise} describe
 * @returns {function(...):Q.Promise}
 */
function makeEc2DescribeProjectFn(describe) {
  /**
   * @param {string} pid
   * @returns {Q.Promise}
   */
  function describeProject(pid) {
    return describe(makeProjectFilter(pid));
  }
  return describeProject;
}

/**
 * @param {function(...):Q.Promise} describe
 * @returns {function(...):Q.Promise}
 */
function makeEc2DescribePrFn(describe) {
  /**
   * @param {string} pid
   * @param {string} pr
   * @returns {Q.Promise}
   */
  function describePr(pid, pr) {
    return describe(
      makeProjectFilter(pid).concat(makePrFilter(pr))
    );
  }
  return describePr;
}

/**
 * @param {function(...):Q.Promise} describe
 * @returns {function(...):Q.Promise}
 */
function makeEc2DescribeDeployment(describe) {
  /**
   * @param {string} pid
   * @param {string} deployment
   * @returns {Q.Promise}
   */
  function describeDeployment(pid, deployment) {
    return describe(
      makeProjectFilter(pid).concat( makeDeploymentFilter(deployment))
    );
  }
  return describeDeployment;
}

/**
 * @param {string} pid
 * @returns {AWSFilter}
 */
function makeProjectFilter(pid) {
  return makeAWSTagFilter(constants.PROJECT_TAG, pid);
}

/**
 * @param {string} deployment
 * @returns {AWSFilter}
 */
function makeDeploymentFilter(deployment) {
  return makeAWSTagFilter(constants.DEPLOYMENT_TAG, deployment);
}

/**
 * @param {string} pr
 * @returns {AWSFilter}
 */
function makePrFilter(pr) {
  pr = pr + '';
  return makeAWSTagFilter(constants.PR_TAG, pr);
}


/**
 * @param {AWSEc2DescribeResults} results
 * @returns {string}
 * @throws {Error}
 */
function findIpFromEc2Describe(results) {
  /** @todo in the future this might be plural, or more likely it will
   be going through an ELB */
  var ip;
  if (!results[0]) {
    throw new Error('createPR: unexpected EC2 create results');
  }
  results[0].Instances.forEach(function(inst) {
    ip = inst.PublicIpAddress;
  });
  if (!ip) {
    throw new Error('createPR: expecting a public IP address');
  }
  return ip;
}

module.exports = {
  areTagsPidPrValid,
  areTagsPidValid,
  throwInvalidPidTag,
  throwInvalidPidPrTag,
  throwInvalidPidDeploymentTag,
  awsTagEc2,
  makeProjectFilter,
  makePrFilter,
  makeAWSVPCFilter,
  makeAWSTagFilter,
  makeAWSFilter,
  makeEc2DescribeFn,
  makeEc2DescribeProjectFn,
  makeEc2DescribePrFn,
  makeEc2DescribeDeployment,
  findIpFromEc2Describe
};