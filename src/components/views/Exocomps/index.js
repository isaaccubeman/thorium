import React, {Component} from "react";
import {Container, Row, Col, Card, CardBody} from "helpers/reactstrap";
import gql from "graphql-tag.macro";
import {graphql, withApollo} from "react-apollo";
import Tour from "helpers/tourHelper";
import Exocomp from "./exocomp";
import ExocompConfig from "./exocompConfig";
import SubscriptionHelper from "helpers/subscriptionHelper";
import UpgradeScreen from "./UpgradeScreen";
import "./style.scss";

export const EXOCOMP_SUB = gql`
  subscription Exocomps($simulatorId: ID!) {
    exocompsUpdate(simulatorId: $simulatorId) {
      id
      state
      parts
      completion
      damage {
        damaged
      }
      destination {
        id
        displayName
        upgradeBoard
      }
      logs {
        timestamp
        message
      }
    }
  }
`;

const stardate = date => {
  var calculatedDate = new Date(date).getTime() / 1000 / 60 / 60 / 30 / 2;
  var subtraction = Math.floor(calculatedDate);
  var finalDate = (calculatedDate - subtraction) * 100000;
  return Math.floor(finalDate) / 10;
};

const trainingSteps = [
  {
    selector: ".nothing",
    content:
      "Exocomps are small robots which can go through small corridors in the ship to repair damaged systems. Damage reports are one place where exocomp instructions might be given.",
  },
  {
    selector: ".exocomp-information",
    content:
      "Information about exocomp activities appears in this box. Be sure to read it to make sure your exocomps are doing what they are supposed to do.",
  },
  {
    selector: ".exocomp-list",
    content:
      "Your exocomps are listed here. Each of your exocomps can be assigned to different parts of the ship at the same time.",
  },
  {
    selector: ".exocomp-list .btn",
    content: "Click this button to assign the exocomp to perform some work.",
  },
  {
    selector: ".destination",
    content: "Choose the destination for your exocomp from this dropdown.",
  },
  {
    selector: ".parts",
    content:
      "Exocomps use parts to perform their work. The parts assigned to this exocomp appear here.",
  },
  {
    selector: ".parts-container",
    content: "Choose the part your exocomp needs from this list.",
  },
  {
    selector: ".card-exocomps .btn-success",
    content: "Click this button to deploy the exocomp.",
  },
  {
    selector: ".exocomp-box",
    content: "Watch this area to see what your exocomp is currently up to.",
  },
];
class Exocomps extends Component {
  state = {selectedExocomp: null, upgradeExocomp: null};
  deploy = (id, destination, parts, upgrade) => {
    const mutation = gql`
      mutation DeployExocomp($exocomp: ExocompInput!) {
        deployExocomp(exocomp: $exocomp)
      }
    `;
    const variables = {
      exocomp: {
        destination,
        parts,
        id,
        upgrade,
      },
    };
    this.props.client.mutate({
      mutation,
      variables,
    });
    this.setState({
      selectedExocomp: null,
    });
  };
  recall = id => {
    const mutation = gql`
      mutation RecallExocomp($exocomp: ID!) {
        recallExocomp(exocomp: $exocomp)
      }
    `;
    const variables = {
      exocomp: id,
    };
    this.props.client.mutate({
      mutation,
      variables,
    });
  };
  clearUpgradeBoard = () => {
    this.setState({upgradeExocomp: null});
  };
  render() {
    const {
      simulator,
      data: {exocomps, loading},
    } = this.props;
    if (loading || !exocomps) return null;
    const {selectedExocomp, upgradeExocomp} = this.state;
    const exocomp = exocomps.find(e => e.id === selectedExocomp);
    const exocompNum = exocomps.findIndex(e => e.id === selectedExocomp) + 1;
    const upgradedExocomp = exocomps.find(e => e.id === upgradeExocomp);
    return (
      <Container className="card-exocomps">
        <SubscriptionHelper
          subscribe={() =>
            this.props.data.subscribeToMore({
              document: EXOCOMP_SUB,
              variables: {
                simulatorId: this.props.simulator.id,
              },
              updateQuery: (previousResult, {subscriptionData}) => {
                return Object.assign({}, previousResult, {
                  exocomps: subscriptionData.data.exocompsUpdate,
                });
              },
            })
          }
        />
        <Row>
          <Col sm={5}>
            <h2>Exocomps</h2>
            <div className="exocomp-list">
              {exocomps.map((e, i) => {
                return (
                  <Exocomp
                    {...e}
                    number={i + 1}
                    key={e.id}
                    select={(ex, upgrade) =>
                      this.setState({selectedExocomp: ex, upgrade})
                    }
                    recall={() => {
                      this.recall(e.id);
                      this.setState({
                        upgrade: false,
                        upgradeExocomp: null,
                        selectedExocomp: null,
                      });
                    }}
                    upgrade={ex => {
                      this.setState({upgradeExocomp: ex});
                    }}
                  />
                );
              })}
            </div>
          </Col>
          <Col sm={7}>
            {selectedExocomp ? (
              <ExocompConfig
                {...exocomp}
                simulatorId={simulator.id}
                cancel={() =>
                  this.setState({
                    selectedExocomp: null,
                    upgradeExocomp: null,
                  })
                }
                number={exocompNum}
                deploy={this.deploy}
                upgrade={this.state.upgrade}
              />
            ) : upgradedExocomp ? (
              <UpgradeScreen
                clearUpgradeBoard={this.clearUpgradeBoard}
                exocompId={upgradedExocomp.id}
                destination={upgradedExocomp.destination}
              />
            ) : (
              <div>
                <h3>Information</h3>
                <Card className="exocomp-information">
                  <CardBody>
                    {exocomps
                      .reduce((prev, next, i) => {
                        return prev.concat(
                          next.logs.map(l =>
                            Object.assign({}, l, {number: i + 1}),
                          ),
                        );
                      }, [])
                      .sort((a, b) => {
                        if (a.timestamp > b.timestamp) return -1;
                        if (a.timestamp < b.timestamp) return 1;
                        return 0;
                      })
                      .map((l, i) => (
                        <p key={`log-${l.timestamp}-${i}`}>
                          {stardate(l.timestamp)} - Exocomp #{l.number}:{" "}
                          {l.message}
                        </p>
                      ))}
                  </CardBody>
                </Card>
              </div>
            )}
          </Col>
        </Row>
        <Tour steps={trainingSteps} client={this.props.clientObj} />
      </Container>
    );
  }
}

export const EXOCOMP_QUERY = gql`
  query Exocomps($simulatorId: ID) {
    exocomps(simulatorId: $simulatorId) {
      id
      state
      parts
      completion
      damage {
        damaged
      }
      logs {
        timestamp
        message
      }
      destination {
        id
        displayName
        upgradeBoard
      }
    }
  }
`;
export default graphql(EXOCOMP_QUERY, {
  options: ownProps => ({
    fetchPolicy: "cache-and-network",
    variables: {
      simulatorId: ownProps.simulator.id,
    },
  }),
})(withApollo(Exocomps));
