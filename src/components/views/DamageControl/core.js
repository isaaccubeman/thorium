import React, { Component } from "react";
import gql from "graphql-tag";
import { graphql, withApollo, Mutation } from "react-apollo";
import { Table, Button } from "reactstrap";
import { InputField, OutputField } from "../../generic/core";

const SYSTEMS_SUB = gql`
  subscription SystemsUpdate($simulatorId: ID) {
    systemsUpdate(simulatorId: $simulatorId) {
      id
      name
      power {
        power
        powerLevels
      }
      damage {
        damaged
        report
        destroyed
      }
      simulatorId
      type
    }
  }
`;

class DamageControlCore extends Component {
  constructor(props) {
    super(props);
    this.systemSub = null;
    this.state = {
      deck: null,
      room: null
    };
  }
  componentWillReceiveProps(nextProps) {
    if (!this.systemSub && !nextProps.data.loading) {
      this.systemSub = nextProps.data.subscribeToMore({
        document: SYSTEMS_SUB,
        variables: {
          simulatorId: nextProps.simulator.id
        },
        updateQuery: (previousResult, { subscriptionData }) => {
          return Object.assign({}, previousResult, {
            systems: subscriptionData.data.systemsUpdate
          });
        }
      });
    }
  }
  componentWillUnmount() {
    this.systemSub && this.systemSub();
  }
  systemStyle(sys) {
    const obj = {
      listStyle: "none",
      cursor: "pointer"
    };
    if (sys.damage.damaged) {
      obj.color = "red";
    }
    if (!sys.name) {
      obj.color = "purple";
    }
    if (sys.damage.destroyed) {
      obj.color = "black";
      obj.textShadow = "0px 0px 1px rgba(255,255,255,1)";
    }
    return obj;
  }
  systemName(sys) {
    if (sys.type === "Shield") {
      return `${sys.name} Shields`;
    }
    if (sys.type === "Engine") {
      return `${sys.name} Engines`;
    }
    return sys.name;
  }
  setPower(system, power) {
    const mutation = gql`
      mutation SetPower($systemId: ID!, $power: Int!) {
        changePower(systemId: $systemId, power: $power)
      }
    `;
    const variables = {
      systemId: system.id,
      power
    };
    this.props.client.mutate({
      mutation,
      variables
    });
  }
  toggleDamage = (e, system, destroyed = false) => {
    e.preventDefault();
    const variables = {
      systemId: system.id,
      destroyed
    };
    let mutation;
    if (system.damage.damaged) {
      // Fix it
      mutation = gql`
        mutation RepairSystem($systemId: ID!) {
          repairSystem(systemId: $systemId)
        }
      `;
    } else {
      // Break it
      mutation = gql`
        mutation DamageSystem($systemId: ID!, $destroyed: Boolean) {
          damageSystem(systemId: $systemId, destroyed: $destroyed)
        }
      `;
    }
    this.props.client.mutate({
      mutation,
      variables
    });
  };
  render() {
    if (this.props.data.loading || !this.props.data.systems) return null;
    return (
      <Mutation
        mutation={gql`
          mutation FluxPower($id: ID, $all: Boolean, $simulatorId: ID) {
            fluxSystemPower(id: $id, all: $all, simulatorId: $simulatorId)
          }
        `}
        variables={{ simulatorId: this.props.simulator.id }}
      >
        {action => (
          <Table size="sm" hover>
            <thead>
              <tr>
                <th>System</th>
                <th>Set</th>
                <th />
                <th>Req</th>
                <th>Flux</th>
              </tr>
            </thead>
            <tbody>
              {this.props.data.systems.map(s => (
                <tr key={s.id}>
                  <td
                    onClick={e => this.toggleDamage(e, s)}
                    onContextMenu={e => this.toggleDamage(e, s, true)}
                    style={this.systemStyle(s)}
                  >
                    {this.systemName(s)}
                  </td>
                  <td>
                    {(s.power.power || s.power.power === 0) && (
                      <InputField
                        prompt="What is the power?"
                        onClick={this.setPower.bind(this, s)}
                      >
                        {s.power.power}
                      </InputField>
                    )}
                  </td>
                  <td>/</td>
                  <td>
                    {(s.power.power || s.power.power === 0) && (
                      <OutputField>{s.power.powerLevels[0]}</OutputField>
                    )}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      color="warning"
                      title="Flux"
                      style={{ height: "15px" }}
                      onClick={() => action({ variables: { id: s.id } })}
                    />
                  </td>
                </tr>
              ))}
              <tr>
                <td>Total</td>
                <td>
                  <OutputField>
                    {this.props.data.systems.reduce(
                      (prev, next) =>
                        next.power ? prev + next.power.power : prev,
                      0
                    )}
                  </OutputField>
                </td>
                <td>/</td>
                <td>
                  <OutputField>
                    {this.props.data.systems.reduce(
                      (prev, next) =>
                        next.power &&
                        next.power.powerLevels &&
                        next.power.powerLevels[0]
                          ? prev + next.power.powerLevels[0]
                          : prev,
                      0
                    )}
                  </OutputField>
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={5}>Right-Click to destroy system</td>
              </tr>
              <tr>
                <td colSpan={1}>
                  <Button block size="sm" color="warning" onClick={action}>
                    Flux Random
                  </Button>
                </td>
                <td colSpan={4}>
                  <Button
                    block
                    size="sm"
                    color="danger"
                    onClick={() =>
                      action({
                        variables: {
                          all: true,
                          simulatorId: this.props.simulator.id
                        }
                      })
                    }
                  >
                    Flux All
                  </Button>
                </td>
              </tr>
            </tbody>
          </Table>
        )}
      </Mutation>
    );
  }
}
const SYSTEMS_QUERY = gql`
  query Systems($simulatorId: ID) {
    systems(simulatorId: $simulatorId) {
      id
      name
      power {
        power
        powerLevels
      }
      damage {
        damaged
        report
        destroyed
      }
      simulatorId
      type
    }
  }
`;

export default graphql(SYSTEMS_QUERY, {
  options: ownProps => ({
    fetchPolicy: "cache-and-network",
    variables: { simulatorId: ownProps.simulator.id }
  })
})(withApollo(DamageControlCore));
