'use strict';

var Q = require('q'),
    util = require('../util'),
    rid = require('../resourceIdentifier'),
    constants = require('../constants');

function getSecurityGroupManager(ec2, vpcId) {
  var describe = Q.nfbind(ec2.describeSecurityGroups.bind(ec2), {
    DryRun: false,
    Filters: constants.AWS_FILTER_CTAG.concat(util.makeAWSVPCFilter(vpcId))
  });

  function create(pid, pr) {
    var id = rid.generateRID({ pid: pid, pr: pr }),
        params = {
      GroupName: id,
      Description: 'Created by clusternator for ' + pid + ', PR: ' + pr,
      VpcId: vpcId
    };

    return Q.nfbind(ec2.createSecurityGroup.bind(ec2), params)().then(function (result) {
      return util.awsTagEc2(ec2, result.GroupId, [{
        Key: constants.CLUSTERNATOR_TAG,
        Value: 'true'
      }, {
        Key: constants.PROJECT_TAG,
        Value: pid
      }, {
        Key: constants.PR_TAG,
        Value: pr
      }]).then(function () {
        return result;
      });
    });
  }

  function destroy(groupId, pid, pr) {
    return describe().then(function (list) {
      var sg,
          isValidPid = false,
          isValidPr = false;
      list.SecurityGroups.forEach(function (g) {
        if (g.GroupId === groupId) {
          sg = g;
        }
      });

      sg.Tags.forEach(function (tag) {
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

      if (!(isValidPid && isValidPr)) {
        throw new Error('No Clusternator Tagged SecurityGroup Available For ' + 'Destruction With GroupId: ' + groupId + ' ProjectId: ' + pid + ' and PR: ' + pr);
      }

      return Q.nfbind(ec2.deleteSecurityGroup.bind(ec2), {
        GroupId: groupId
      })();
    });
  }

  return {
    describe: describe,
    create: create,
    destroy: destroy
  };
}

module.exports = getSecurityGroupManager;