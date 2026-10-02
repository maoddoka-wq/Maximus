import { AuthenticatedTabGate } from '../../src/components/AuthenticatedTabGate';
import { DriverTripsScreen } from '../../src/screens/DriverTripsScreen';

export default function TripsRoute() {
  return <AuthenticatedTabGate>{(session) => <DriverTripsScreen session={session} />}</AuthenticatedTabGate>;
}