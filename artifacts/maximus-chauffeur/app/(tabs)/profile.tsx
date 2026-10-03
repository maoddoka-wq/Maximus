import { AuthenticatedTabGate } from '../../src/components/AuthenticatedTabGate';
import { DriverProfileScreen } from '../../src/screens/DriverProfileScreen';

export default function ProfileRoute() {
  return <AuthenticatedTabGate>{(session) => <DriverProfileScreen session={session} />}</AuthenticatedTabGate>;
}