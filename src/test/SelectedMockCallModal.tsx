import Modal, { ModalBody, ModalFooter, ModalHeader } from "../Modal";
import type { StepDefinition, MockCall } from "../Test";

export const renderMockCallArgsLabel = ([url, ...options]: any[]) => {
  const method =
    options.length && options[0].method ? options[0].method : "get";

  return `${method.toUpperCase()} ${url}`;
};

type SelectedMockCallModalProps = {
  selectedMockCall: MockCall;
  onClose: () => void;
  onUpdateStep: (step: StepDefinition) => void;
};

const SelectedMockCallModal = ({
  selectedMockCall: [name, args],
  onClose,
  onUpdateStep,
}: SelectedMockCallModalProps) => (
  <Modal onClose={onClose}>
    <ModalBody>
      <ModalHeader>
        {name}{" "}
        <span className="font-bold">{renderMockCallArgsLabel(args)}</span>
      </ModalHeader>
    </ModalBody>
    <ModalFooter>
      <button
        className="shadow-md bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-4 rounded-full my-2 ml-2"
        onClick={() =>
          onUpdateStep({
            type: "assertion",
            definition: {
              type: "mock",
              target: {
                name,
                args,
              },
            },
          })
        }
      >
        Assert called
      </button>

      <button
        className="shadow-md bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-full my-2 ml-2"
        onClick={() =>
          onUpdateStep({
            type: "mock",
            definition: {
              name,
              args,
              return: null,
            },
          })
        }
      >
        Mock
      </button>
    </ModalFooter>
  </Modal>
);

export default SelectedMockCallModal;
